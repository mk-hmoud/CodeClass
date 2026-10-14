import logger from '../config/logger';
import { RequestHandler } from 'express';
import { createUser as createAuthUser, findUserByEmail } from '../models/AuthModel';
import { getAllUsers as fetchAllUsers, getAllClassroomsAdmin, deleteClassroomAdmin, getPlatformAnalytics } from '../models/AdminModel';
import { deleteUser as deleteUserModel } from '../models/UserModel';
import { getMaintenanceMode, setMaintenanceMode } from '../models/SystemSettingsModel';
import bcrypt from 'bcrypt';
import { generateStudentPassword } from '../utils/password';

/**
 * Institutional email convention for student accounts: the student number is
 * the local part. The client derives the same address when matching a roster
 * row back to an account.
 */
const STUDENT_EMAIL_DOMAIN = 'eul.edu.tr';

export const createUser: RequestHandler = async (req, res) => {
  const functionName = "createUser(Admin)";
  logger.debug({ fn: functionName, body: req.body }, `Admin Create User request received`);
  try {
    const { first_name, last_name, email, password, role } = req.body;
    if (!first_name || !email || !password || !role || !['instructor', 'student'].includes(role)) {
      res.status(400).json({
        success: false,
        message: 'First name, email, password, and valid role (instructor or student) are required'
      });
      return;
    }
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ success: false, message: 'User with this email already exists' });
      return;
    }
    
    
    const newUser = await createAuthUser({
      first_name,
      last_name,
      email,
      password,
      role,
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.user_id,

        email: newUser.email,
        name: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim(),
        role: newUser.role,
      },
    });
  } catch (error) {
    logger.error({ fn: functionName, error }, `Create user error: ${error}`);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating user',
    });
  }
};

export const getAllUsers: RequestHandler = async (req, res) => {
  try {
    const users = await fetchAllUsers();
    res.status(200).json({ success: true, users });
  } catch (error) {
    logger.error({ fn: 'getAllUsers', error }, `Get all users error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while fetching users' });
  }
};

export const deleteUser: RequestHandler = async (req, res) => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }
    await deleteUserModel(userId);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error({ fn: 'deleteUser', error }, `Delete user error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while deleting user' });
  }
};

export const getAllClassrooms: RequestHandler = async (req, res) => {
  try {
    const classrooms = await getAllClassroomsAdmin();
    res.status(200).json({ success: true, classrooms });
  } catch (error) {
    logger.error({ fn: 'getAllClassrooms', error }, `Get all classrooms error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while fetching classrooms' });
  }
};

export const deleteClassroom: RequestHandler = async (req, res) => {
  try {
    const classroomId = parseInt(req.params.id as string, 10);
    if (isNaN(classroomId)) {
      res.status(400).json({ success: false, message: 'Invalid classroom ID' });
      return;
    }
    await deleteClassroomAdmin(classroomId);
    res.status(200).json({ success: true, message: 'Classroom deleted successfully' });
  } catch (error) {
    logger.error({ fn: 'deleteClassroom', error }, `Delete classroom error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while deleting classroom' });
  }
};

export const getAnalytics: RequestHandler = async (req, res) => {
  try {
    const analytics = await getPlatformAnalytics();
    res.status(200).json({ success: true, analytics });
  } catch (error) {
    logger.error({ fn: 'getAnalytics', error }, `Get analytics error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while fetching analytics' });
  }
};

export const getMaintenanceStatus: RequestHandler = async (req, res) => {
  try {
    const maintenance_mode = await getMaintenanceMode();
    res.status(200).json({ success: true, maintenance_mode });
  } catch (error) {
    logger.error({ fn: 'getMaintenanceStatus', error }, `Get maintenance status error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while fetching maintenance status' });
  }
};

export const setMaintenanceStatus: RequestHandler = async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ success: false, message: 'enabled must be a boolean' });
      return;
    }
    await setMaintenanceMode(enabled);
    logger.info({ fn: 'setMaintenanceStatus', enabled, adminId: req.user?.id }, `Maintenance mode set to ${enabled}`);
    res.status(200).json({ success: true, maintenance_mode: enabled });
  } catch (error) {
    logger.error({ fn: 'setMaintenanceStatus', error }, `Set maintenance status error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while updating maintenance status' });
  }
};

export const changeUserPassword: RequestHandler = async (req, res) => {
  try {
    const userId = parseInt(req.params.id as string, 10);
    const { newPassword } = req.body;
    
    if (isNaN(userId) || !newPassword) {
      res.status(400).json({ success: false, message: 'Invalid user ID or missing password' });
      return;
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { updateUserPassword } = await import('../models/AdminModel');
    await updateUserPassword(userId, passwordHash);
    
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    logger.error({ fn: 'changeUserPassword', error }, `Change password error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while changing password' });
  }
};

/**
 * Hashes with bounded concurrency. bcrypt runs on libuv's threadpool, so a
 * sequential loop over a 300-student roster spends ~25s wall-clock with three
 * of four threads idle; batching keeps one HTTP request plausible.
 */
const hashAll = async (passwords: string[]): Promise<string[]> => {
  const out: string[] = [];
  const CONCURRENCY = 8;
  for (let i = 0; i < passwords.length; i += CONCURRENCY) {
    out.push(...(await Promise.all(passwords.slice(i, i + CONCURRENCY).map((p) => bcrypt.hash(p, 10)))));
  }
  return out;
};

export const bulkCreateUsers: RequestHandler = async (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) {
      res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of students.' });
      return;
    }

    const { bulkCreateStudents } = await import('../models/AdminModel');

    const candidates = students
      .filter((s: any) => s.first_name && s.last_name && s.student_number)
      .map((s: any) => ({
        email: `${s.student_number}@${STUDENT_EMAIL_DOMAIN}`,
        firstName: s.first_name,
        lastName: s.last_name,
        studentNumber: String(s.student_number),
        // One password per student. Returned once, in this response, and never
        // recoverable afterwards -- only the hash is stored.
        password: generateStudentPassword(),
      }));

    if (candidates.length === 0) {
      res.status(400).json({ success: false, message: 'No valid students found to import.' });
      return;
    }

    const hashes = await hashAll(candidates.map((c) => c.password));
    const result = await bulkCreateStudents(
      candidates.map((c, i) => ({
        email: c.email,
        passwordHash: hashes[i],
        firstName: c.firstName,
        lastName: c.lastName,
      }))
    );

    const createdEmails = new Set(result.imported);
    const credentials = candidates
      .filter((c) => createdEmails.has(c.email))
      .map((c) => ({
        first_name: c.firstName,
        last_name: c.lastName,
        student_number: c.studentNumber,
        email: c.email,
        password: c.password,
      }));

    res.status(200).json({
      success: true,
      message: `Import complete. Imported: ${result.imported.length}, Skipped duplicates: ${result.skipped.length}`,
      data: { credentials, skipped: result.skipped },
    });
  } catch (error) {
    logger.error({ fn: 'bulkCreateUsers', error }, `Bulk create users error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred during bulk import.' });
  }
};

/**
 * Issues a fresh generated password to students that already exist, and returns
 * the list once. Needed because the accounts imported before this change all
 * share one password.
 */
export const resetStudentPasswordsController: RequestHandler = async (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students) || students.length === 0) {
      res.status(400).json({ success: false, message: 'Expected an array of students.' });
      return;
    }

    const { resetStudentPasswords } = await import('../models/AdminModel');

    const candidates = students
      .filter((s: any) => s.student_number)
      .map((s: any) => ({
        email: `${s.student_number}@${STUDENT_EMAIL_DOMAIN}`,
        firstName: s.first_name ?? '',
        lastName: s.last_name ?? '',
        studentNumber: String(s.student_number),
        password: generateStudentPassword(),
      }));

    if (candidates.length === 0) {
      res.status(400).json({ success: false, message: 'No student numbers found.' });
      return;
    }

    const hashes = await hashAll(candidates.map((c) => c.password));
    const result = await resetStudentPasswords(
      candidates.map((c, i) => ({ email: c.email, passwordHash: hashes[i] }))
    );

    const updatedEmails = new Set(result.updated);
    const credentials = candidates
      .filter((c) => updatedEmails.has(c.email))
      .map((c) => ({
        first_name: c.firstName,
        last_name: c.lastName,
        student_number: c.studentNumber,
        email: c.email,
        password: c.password,
      }));

    res.status(200).json({
      success: true,
      message: `Passwords reset for ${result.updated.length} student${result.updated.length === 1 ? '' : 's'}.` +
        (result.notFound.length > 0 ? ` ${result.notFound.length} had no account.` : ''),
      data: { credentials, notFound: result.notFound },
    });
  } catch (error) {
    logger.error({ fn: 'resetStudentPasswordsController', error }, `Reset passwords error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred while resetting passwords.' });
  }
};

export const bulkEnrollStudents: RequestHandler = async (req, res) => {
  try {
    const classroomId = parseInt(req.params.id as string, 10);
    const { emails } = req.body;
    
    if (isNaN(classroomId) || !emails || !Array.isArray(emails)) {
      res.status(400).json({ success: false, message: 'Invalid data format or classroom ID.' });
      return;
    }

    const { bulkEnrollToClassroom } = await import('../models/AdminModel');
    const result = await bulkEnrollToClassroom(classroomId, emails);
    
    res.status(200).json({ 
      success: true, 
      message: `Enrollment complete. Enrolled: ${result.enrolled}. Skipped/Not Found: ${result.notFound}` 
    });
  } catch (error) {
    logger.error({ fn: 'bulkEnrollStudents', error }, `Bulk enroll students error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred during bulk enrollment.' });
  }
};
