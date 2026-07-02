import logger from '../config/logger';
import { RequestHandler } from 'express';
import { createUser as createAuthUser, findUserByEmail, findUserByUsername } from '../models/AuthModel';
import { getAllUsers as fetchAllUsers } from '../models/AdminModel';
import { deleteUser as deleteUserModel } from '../models/UserModel';

export const createUser: RequestHandler = async (req, res) => {
  const functionName = "createUser(Admin)";
  logger.debug({ fn: functionName, body: req.body }, `Admin Create User request received`);
  try {
    const { first_name, last_name, username, email, password, role } = req.body;
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
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      res.status(409).json({ success: false, message: 'Another user with this username already exists' });
      return;
    }
    
    const newUser = await createAuthUser({
      first_name,
      last_name,
      username,
      email,
      password,
      role,
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.user_id,
        username: newUser.username,
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
    const userId = parseInt(req.params.id, 10);
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
