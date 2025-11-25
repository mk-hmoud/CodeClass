import logger from '../config/logger';
import { Request, Response } from 'express';
import { createUser, getUserById, getUserByEmail, deleteUser } from '../models/UserModel';


export const createUserController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'createUserController';
  try {
    
    logger.info(
      { fn: functionName },
      "Received request to create user."
    );
    const userData = req.body;
    const userId = await createUser(userData);
    logger.info(
      { fn: functionName, userId },
      `User created with ID: ${userId}`
    );
    res.status(201).json({ success: true, data: { userId } });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error creating user: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

export const getUserByIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getUserByIdController';
  try {
    const userId = Number(req.params.userId);
    logger.info(
      { fn: functionName, userId },
      `Received request to fetch user with ID: ${userId}`
    );
    
    const user = await getUserById(userId);
    logger.info(
      { fn: functionName, userId },
      `Fetched user with ID: ${userId}`
    );
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error fetching user: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

export const deleteUserController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'deleteUserController';
  try {
    const userId = Number(req.params.userId);
    logger.info(
      { fn: functionName, userId },
      `Received request to delete user with ID: ${userId}`
    );
    await deleteUser(userId);
    logger.info(
      { fn: functionName, userId },
      `Deleted user with ID: ${userId}`
    );
    
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error(
      { fn: functionName, error },
      `Error deleting user: ${error}`
    );
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};
