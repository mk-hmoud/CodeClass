import { Request, Response } from 'express';
import { createUser, getUserById, getUserByEmail, deleteUser } from '../models/UserModel';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [UserController.ts] [${functionName}] ${message}`);
};

export const createUserController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'createUserController';
  try {
    logMessage(functionName, "Received request to create user.");
    const userData = req.body;
    const userId = await createUser(userData);
    logMessage(functionName, `User created with ID: ${userId}`);
    res.status(201).json({ success: true, data: { userId } });
  } catch (error) {
    logMessage(functionName, `Error creating user: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

export const getUserByIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getUserByIdController';
  try {
    const userId = Number(req.params.userId);
    logMessage(functionName, `Received request to fetch user with ID: ${userId}`);
    const user = await getUserById(userId);
    logMessage(functionName, `Fetched user with ID: ${userId}`);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logMessage(functionName, `Error fetching user: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

export const deleteUserController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'deleteUserController';
  try {
    const userId = Number(req.params.userId);
    logMessage(functionName, `Received request to delete user with ID: ${userId}`);
    await deleteUser(userId);
    logMessage(functionName, `Deleted user with ID: ${userId}`);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logMessage(functionName, `Error deleting user: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};
