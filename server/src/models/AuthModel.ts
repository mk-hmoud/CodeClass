import pool from '../config/db';
import logger from "../config/logger";
import bcrypt from 'bcrypt';

export interface User {
  user_id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'instructor' | 'student';
  role_id: number;
}

export interface UserWithPassword extends User {
  password_hash: string;
  must_change_password: boolean;
}

/**
 * Reads the forced-change flag straight from the table. Only needed for tokens
 * minted before the flag existed, which carry no claim either way -- see
 * authMiddleware. Those expire within the token lifetime, after which this is
 * never called again.
 */
export async function getMustChangePassword(userId: number): Promise<boolean> {
  const functionName = 'getMustChangePassword';
  try {
    const { rows } = await pool.query(
      `SELECT must_change_password FROM users WHERE user_id = $1`,
      [userId]
    );
    return rows[0]?.must_change_password === true;
  } catch (error: any) {
    logger.error({ fn: functionName, userId, error }, `Error reading must_change_password: ${error.message}`);
    throw error;
  }
}

/**
 * Replaces the holder's own password and clears the forced-change flag in one
 * statement, so an interrupted call cannot leave an account with a new password
 * it is still being nagged about (or, worse, the old password and no nag).
 */
export async function setOwnPassword(userId: number, passwordHash: string): Promise<void> {
  const functionName = 'setOwnPassword';
  try {
    await pool.query(
      `UPDATE users SET password_hash = $2, must_change_password = FALSE WHERE user_id = $1`,
      [userId, passwordHash]
    );
    logger.info({ fn: functionName, userId }, `Password set by holder for user ${userId}`);
  } catch (error: any) {
    logger.error({ fn: functionName, userId, error }, `Error setting own password: ${error.message}`);
    throw error;
  }
}

export async function createUser(userData: {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
  role: 'instructor' | 'student';
}): Promise<User> {
  const functionName = 'createUser';
  const { first_name, last_name, email, password, role } = userData;
  logger.info(
    { fn: functionName, email, role },
    `Creating user in database: email=${email}, role=${role}`
  );
  const client = await pool.connect();
  try {
    logger.debug({ fn: functionName, email }, `Hashing password for: ${email}`);
    const password_hash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');
    const userQuery = `
      INSERT INTO users (first_name, last_name, email, password_hash, must_change_password)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING user_id, email, first_name, last_name
    `;
    logger.debug({ fn: functionName, email }, `Executing user insert query for: ${email}`);
    const userResult = await client.query(userQuery, [first_name, last_name || null, email, password_hash]);
    const newUser = userResult.rows[0];
    logger.info(
      { fn: functionName, userId: newUser.user_id, email: newUser.email },
      `User inserted: user_id=${newUser.user_id}, email=${newUser.email}`
    );

    let role_id: number;
    if (role === 'instructor') {
      logger.debug(
        { fn: functionName, userId: newUser.user_id },
        `Inserting instructor record for user_id: ${newUser.user_id}`
      );
      const instructorResult = await client.query(
        `INSERT INTO instructors (user_id) VALUES ($1) RETURNING instructor_id as role_id`,
        [newUser.user_id]
      );
      role_id = instructorResult.rows[0].role_id;
    } else {
      logger.debug(
        { fn: functionName, userId: newUser.user_id },
        `Inserting student record for user_id: ${newUser.user_id}`
      );
      const studentResult = await client.query(
        `INSERT INTO students (user_id) VALUES ($1) RETURNING student_id as role_id`,
        [newUser.user_id]
      );
      role_id = studentResult.rows[0].role_id;
    }

    await client.query('COMMIT');
    logger.info({ fn: functionName, email }, `Transaction committed for user: ${email}`);

    return {
      user_id: newUser.user_id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      role,
      role_id,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error({ fn: functionName, email, error }, `Error creating user: ${error.message}`);
    console.error(error);
    throw error;
  } finally {
    client.release();
    logger.debug({ fn: functionName, email }, 'Database client released for user creation.');
  }
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const functionName = 'findUserByEmail';
  logger.info({ fn: functionName, email }, `Searching for user by email: ${email}`);
  try {
    const userQuery = `SELECT * FROM users WHERE email = $1`;
    const userResult = await pool.query(userQuery, [email]);
    if (userResult.rows.length === 0) {
      logger.debug({ fn: functionName, email }, `No user found for email: ${email}`);
      return null;
    }

    const query = `
      SELECT 
        u.user_id, 
        u.email, 
        u.first_name, 
        u.last_name,
        u.password_hash,
        u.must_change_password,
        COALESCE(
          (SELECT 'admin' FROM roles r JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = u.user_id AND r.role_name = 'admin' LIMIT 1),
          (SELECT 'instructor' FROM instructors WHERE user_id = u.user_id), 
          'student'
        ) as role,
        COALESCE(
          (SELECT ur.role_id FROM roles r JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = u.user_id AND r.role_name = 'admin' LIMIT 1),
          (SELECT instructor_id FROM instructors WHERE user_id = u.user_id),
          (SELECT student_id FROM students WHERE user_id = u.user_id)
        ) as role_id
      FROM users u
      WHERE u.email = $1
      AND (
        EXISTS (SELECT 1 FROM roles r JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = u.user_id AND r.role_name = 'admin')
        OR EXISTS (SELECT 1 FROM instructors WHERE user_id = u.user_id)
        OR EXISTS (SELECT 1 FROM students WHERE user_id = u.user_id)
      )
    `;
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) {
      logger.warn({ fn: functionName, email }, `User exists but has no role assigned: ${email}`);
      return null;
    }

    logger.info(
      { fn: functionName, email, userId: result.rows[0].user_id },
      `User found for email: ${email}, user_id=${result.rows[0].user_id}`
    );
    return result.rows[0] as UserWithPassword;
  } catch (error: any) {
    logger.error({ fn: functionName, email, error }, `Error finding user by email: ${error.message}`);
    console.error(error);
    throw error;
  }
}

export async function findUserById(userId: number): Promise<User | null> {
  const functionName = 'findUserById';
  logger.info({ fn: functionName, userId }, `Searching for user by ID: ${userId}`);
  try {
    const query = `
      SELECT 
        u.user_id, 
        u.email, 
        u.first_name, 
        u.last_name,
        COALESCE(
          (SELECT 'admin' FROM roles r JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = u.user_id AND r.role_name = 'admin' LIMIT 1),
          (SELECT 'instructor' FROM instructors WHERE user_id = u.user_id), 
          'student'
        ) as role,
        COALESCE(
          (SELECT ur.role_id FROM roles r JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = u.user_id AND r.role_name = 'admin' LIMIT 1),
          (SELECT instructor_id FROM instructors WHERE user_id = u.user_id),
          (SELECT student_id FROM students WHERE user_id = u.user_id)
        ) as role_id
      FROM users u
      WHERE u.user_id = $1
      AND (
        EXISTS (SELECT 1 FROM roles r JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = u.user_id AND r.role_name = 'admin')
        OR EXISTS (SELECT 1 FROM instructors WHERE user_id = u.user_id)
        OR EXISTS (SELECT 1 FROM students WHERE user_id = u.user_id)
      )
    `;
    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      logger.warn({ fn: functionName, userId }, `No user found with ID or user has no role: ${userId}`);
      return null;
    }

    logger.info({ fn: functionName, userId }, `User found with ID: ${userId}`);
    return result.rows[0] as User;
  } catch (error: any) {
    logger.error({ fn: functionName, userId, error }, `Error finding user by ID: ${error.message}`);
    console.error(error);
    throw error;
  }
}



export async function validateUserPassword(user: UserWithPassword, password: string): Promise<boolean> {
  const functionName = 'validateUserPassword';
  logger.debug(
    { fn: functionName, email: user.email },
    `Validating password for user: ${user.email}`
  );
  try {
    const isValid = await bcrypt.compare(password, user.password_hash);
    logger.debug(
      { fn: functionName, email: user.email, isValid },
      `Password validation result for user: ${user.email}, isValid=${isValid}`
    );
    return isValid;
  } catch (error: any) {
    logger.error(
      { fn: functionName, email: user.email, error },
      `Error validating password for user: ${user.email}, error=${error.message}`
    );
    console.error(error);
    throw error;
  }
}