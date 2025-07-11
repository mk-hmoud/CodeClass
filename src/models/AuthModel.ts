import pool from '../config/db';
import bcrypt from 'bcrypt';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AuthModel.ts] [${functionName}] ${message}`);
};

export interface User {
  user_id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'instructor' | 'student';
  role_id: number;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export async function createUser(userData: {
  first_name: string;
  last_name?: string;
  username: string;
  email: string;
  password: string;
  role: 'instructor' | 'student';
}): Promise<User> {
  const functionName = 'createUser';
  const { first_name, last_name, username, email, password, role } = userData;
  logMessage(functionName, `Creating user in database: email=${email}, role=${role}`);
  const client = await pool.connect();
  try {
    logMessage(functionName, `Hashing password for: ${email}`);
    const password_hash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');
    const userQuery = `
      INSERT INTO users (first_name, last_name, username, email, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, username, email, first_name, last_name
    `;
    logMessage(functionName, `Executing user insert query for: ${email}`);
    const userResult = await client.query(userQuery, [first_name, last_name || null, username, email, password_hash]);
    const newUser = userResult.rows[0];
    logMessage(functionName, `User inserted: user_id=${newUser.user_id}, email=${newUser.email}`);

    let role_id: number;
    if (role === 'instructor') {
      logMessage(functionName, `Inserting instructor record for user_id: ${newUser.user_id}`);
      const instructorResult = await client.query(
        `INSERT INTO instructors (user_id) VALUES ($1) RETURNING instructor_id as role_id`,
        [newUser.user_id]
      );
      role_id = instructorResult.rows[0].role_id;
    } else {
      logMessage(functionName, `Inserting student record for user_id: ${newUser.user_id}`);
      const studentResult = await client.query(
        `INSERT INTO students (user_id) VALUES ($1) RETURNING student_id as role_id`,
        [newUser.user_id]
      );
      role_id = studentResult.rows[0].role_id;
    }

    await client.query('COMMIT');
    logMessage(functionName, `Transaction committed for user: ${email}`);

    return {
      user_id: newUser.user_id,
      username: newUser.username,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      role,
      role_id,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logMessage(functionName, `Error creating user: ${error.message}`);
    console.error(error);
    throw error;
  } finally {
    client.release();
    logMessage(functionName, `Database client released for user creation.`);
  }
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const functionName = 'findUserByEmail';
  logMessage(functionName, `Searching for user by email: ${email}`);
  try {
    const userQuery = `SELECT * FROM users WHERE email = $1`;
    const userResult = await pool.query(userQuery, [email]);
    if (userResult.rows.length === 0) {
      logMessage(functionName, `No user found for email: ${email}`);
      return null;
    }

    const query = `
      SELECT 
        u.user_id, 
        u.email, 
        u.first_name, 
        u.last_name,
        u.password_hash,
        COALESCE(
          (SELECT 'instructor' FROM instructors WHERE user_id = u.user_id), 
          'student'
        ) as role,
        COALESCE(
          (SELECT instructor_id FROM instructors WHERE user_id = u.user_id),
          (SELECT student_id FROM students WHERE user_id = u.user_id)
        ) as role_id
      FROM users u
      WHERE u.email = $1
      AND (
        EXISTS (SELECT 1 FROM instructors WHERE user_id = u.user_id)
        OR EXISTS (SELECT 1 FROM students WHERE user_id = u.user_id)
      )
    `;
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) {
      logMessage(functionName, `User exists but has no role assigned: ${email}`);
      return null;
    }

    logMessage(functionName, `User found for email: ${email}, user_id=${result.rows[0].user_id}`);
    return result.rows[0] as UserWithPassword;
  } catch (error: any) {
    logMessage(functionName, `Error finding user by email: ${error.message}`);
    console.error(error);
    throw error;
  }
}

export async function findUserById(userId: number): Promise<User | null> {
  const functionName = 'findUserById';
  logMessage(functionName, `Searching for user by ID: ${userId}`);
  try {
    const query = `
      SELECT 
        u.user_id, 
        u.email, 
        u.first_name, 
        u.last_name,
        COALESCE(
          (SELECT 'instructor' FROM instructors WHERE user_id = u.user_id), 
          'student'
        ) as role,
        COALESCE(
          (SELECT instructor_id FROM instructors WHERE user_id = u.user_id),
          (SELECT student_id FROM students WHERE user_id = u.user_id)
        ) as role_id
      FROM users u
      WHERE u.user_id = $1
      AND (
        EXISTS (SELECT 1 FROM instructors WHERE user_id = u.user_id)
        OR EXISTS (SELECT 1 FROM students WHERE user_id = u.user_id)
      )
    `;
    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      logMessage(functionName, `No user found with ID or user has no role: ${userId}`);
      return null;
    }

    logMessage(functionName, `User found with ID: ${userId}`);
    return result.rows[0] as User;
  } catch (error: any) {
    logMessage(functionName, `Error finding user by ID: ${error.message}`);
    console.error(error);
    throw error;
  }
}

export async function findUserByUsername(username: string): Promise<UserWithPassword | null> {
  const functionName = 'findUserByUsername';
  logMessage(functionName, `Searching for user by username: ${username}`);
  try {
    const userQuery = `SELECT * FROM users WHERE username = $1`;
    const userResult = await pool.query(userQuery, [username]);
    if (userResult.rows.length === 0) {
      logMessage(functionName, `No user found for username: ${username}`);
      return null;
    }

    const query = `
      SELECT 
        u.user_id, 
        u.email, 
        u.first_name, 
        u.last_name,
        u.password_hash,
        COALESCE(
          (SELECT 'instructor' FROM instructors WHERE user_id = u.user_id), 
          'student'
        ) as role,
        COALESCE(
          (SELECT instructor_id FROM instructors WHERE user_id = u.user_id),
          (SELECT student_id FROM students WHERE user_id = u.user_id)
        ) as role_id
      FROM users u
      WHERE u.username = $1
      AND (
        EXISTS (SELECT 1 FROM instructors WHERE user_id = u.user_id)
        OR EXISTS (SELECT 1 FROM students WHERE user_id = u.user_id)
      )
    `;
    const result = await pool.query(query, [username]);
    if (result.rows.length === 0) {
      logMessage(functionName, `User exists but has no role assigned: ${username}`);
      return null;
    }

    logMessage(functionName, `User found for username: ${username}, user_id=${result.rows[0].user_id}`);
    return result.rows[0] as UserWithPassword;
  } catch (error: any) {
    logMessage(functionName, `Error finding user by username: ${error.message}`);
    console.error(error);
    throw error;
  }
}

export async function validateUserPassword(user: UserWithPassword, password: string): Promise<boolean> {
  const functionName = 'validateUserPassword';
  logMessage(functionName, `Validating password for user: ${user.email}`);
  try {
    const isValid = await bcrypt.compare(password, user.password_hash);
    logMessage(functionName, `Password validation result for user: ${user.email}, isValid=${isValid}`);
    return isValid;
  } catch (error: any) {
    logMessage(functionName, `Error validating password for user: ${user.email}, error=${error.message}`);
    console.error(error);
    throw error;
  }
}