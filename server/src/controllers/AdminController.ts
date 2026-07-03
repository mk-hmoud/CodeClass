import logger from '../config/logger';
import { RequestHandler } from 'express';
import { createUser as createAuthUser, findUserByEmail } from '../models/AuthModel';
import { getAllUsers as fetchAllUsers, getAllClassroomsAdmin, deleteClassroomAdmin, getPlatformAnalytics } from '../models/AdminModel';
import { deleteUser as deleteUserModel } from '../models/UserModel';
import bcrypt from 'bcrypt';

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

export const bulkCreateUsers: RequestHandler = async (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) {
      res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of students.' });
      return;
    }

    const { bulkCreateStudents } = await import('../models/AdminModel');
    const processedStudents = [];
    
    for (const student of students) {
      if (!student.first_name || !student.last_name || !student.student_number) continue;
      
      const email = `${student.student_number}@eul.edu.tr`;
      const passwordHash = await bcrypt.hash('eul12345', 10);
      
      processedStudents.push({
        email,
        passwordHash,
        firstName: student.first_name,
        lastName: student.last_name
      });
    }

    if (processedStudents.length === 0) {
      res.status(400).json({ success: false, message: 'No valid students found to import.' });
      return;
    }

    const result = await bulkCreateStudents(processedStudents);
    res.status(200).json({ success: true, message: `Import complete. Imported: ${result.imported}, Skipped duplicates: ${result.skipped}` });
  } catch (error) {
    logger.error({ fn: 'bulkCreateUsers', error }, `Bulk create users error: ${error}`);
    res.status(500).json({ success: false, message: 'An error occurred during bulk import.' });
  }
};
