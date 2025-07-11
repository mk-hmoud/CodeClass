import pool from "../config/db";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [UserModel.ts] [${functionName}] ${message}`);
};

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
    logMessage(functionName, "Creating new user.");
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
    logMessage(functionName, `User created with ID: ${userId}.`);
    return userId;
  } catch (error) {
    logMessage(functionName, `Error creating user: ${error}`);
    throw error;
  }
};

export const getUserById = async (userId: number): Promise<User> => {
  const functionName = "getUserById";
  try {
    logMessage(functionName, `Fetching user with ID: ${userId}.`);
    const query = `SELECT * FROM users WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    if (result.rowCount === 0) {
      logMessage(functionName, "User not found.");
      throw new Error("User not found");
    }
    logMessage(functionName, `User with ID: ${userId} fetched successfully.`);
    return result.rows[0];
  } catch (error) {
    logMessage(functionName, `Error fetching user: ${error}`);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User> => {
  const functionName = "getUserByEmail";
  try {
    logMessage(functionName, `Fetching user with email: ${email}.`);
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    if (result.rowCount === 0) {
      logMessage(functionName, "User not found.");
      throw new Error("User not found");
    }
    logMessage(functionName, "User fetched successfully by email.");
    return result.rows[0];
  } catch (error) {
    logMessage(functionName, `Error fetching user by email: ${error}`);
    throw error;
  }
};

export const deleteUser = async (userId: number): Promise<void> => {
  const functionName = "deleteUser";
  try {
    logMessage(functionName, `Deleting user with ID: ${userId}.`);
    const query = `DELETE FROM users WHERE user_id = $1`;
    await pool.query(query, [userId]);
    logMessage(functionName, "User deleted successfully.");
  } catch (error) {
    logMessage(functionName, `Error deleting user: ${error}`);
    throw error;
  }
};
