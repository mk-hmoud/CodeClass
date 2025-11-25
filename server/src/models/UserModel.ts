import pool from "../config/db";
import logger from "../config/logger";


export interface User {
  user_id?: number;
  username: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export const createUser = async (userData: User): Promise<number> => {
  const functionName = "createUser";
  try {
    logger.info({ functionName, username: userData.username }, "Creating new user.");
    const query = `
      INSERT INTO users (username, password_hash, first_name, last_name, email)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id
    `;
    const result = await pool.query(query, [
      userData.username,
      userData.password_hash,
      userData.first_name || null,
      userData.last_name || null,
      userData.email || null,
    ]);
    const userId: number = result.rows[0].user_id;
    logger.info(
      { functionName, userId, username: userData.username },
      `User created with ID: ${userId}.`
    );
    
    return userId;
  } catch (error) {
    logger.error(
      { functionName, username: userData.username, error },
      `Error creating user: ${error}`
    );
    throw error;
  }
};

export const getUserById = async (userId: number): Promise<User> => {
  const functionName = "getUserById";
  try {
    logger.info({ functionName, userId }, `Fetching user with ID: ${userId}.`);
    const query = `SELECT * FROM users WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    if (result.rowCount === 0) {
      logger.warn({ functionName, userId }, "User not found.");
      throw new Error("User not found");
    }
    logger.info(
      { functionName, userId },
      `User with ID: ${userId} fetched successfully.`
    );
    return result.rows[0];
  } catch (error) {
    logger.error(
      { functionName, userId, error },
      `Error fetching user: ${error}`
    );
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User> => {
  const functionName = "getUserByEmail";
  try {
    logger.info({ functionName, email }, `Fetching user with email: ${email}.`);
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    if (result.rowCount === 0) {
      logger.warn({ functionName, email }, "User not found.");
      throw new Error("User not found");
    }
    logger.info(
      { functionName, email },
      "User fetched successfully by email."
    );
    return result.rows[0];
  } catch (error) {
    logger.error(
      { functionName, email, error },
      `Error fetching user by email: ${error}`
    );
    throw error;
  }
};

export const deleteUser = async (userId: number): Promise<void> => {
  const functionName = "deleteUser";
  try {
    logger.info({ functionName, userId }, `Deleting user with ID: ${userId}.`);
    const query = `DELETE FROM users WHERE user_id = $1`;
    await pool.query(query, [userId]);
    logger.info({ functionName, userId }, "User deleted successfully.");
  } catch (error) {
    logger.error(
      { functionName, userId, error },
      `Error deleting user: ${error}`
    );
    throw error;
  }
};
