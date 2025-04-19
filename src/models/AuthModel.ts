import pool from '../config/db';
import bcrypt from 'bcrypt';

export interface User {
  user_id: number;
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
  email: string;
  password: string;
  role: 'instructor' | 'student';
}): Promise<User> {
  console.log('Creating user in database:', { email: userData.email, role: userData.role });
  const client = await pool.connect();
  try {
    const { first_name, last_name, email, password, role } = userData;
    console.log('Hashing password for:', { email });
    const password_hash = await bcrypt.hash(password, 10);
    await client.query('BEGIN');

    const userQuery = `
      INSERT INTO users (first_name, last_name, email, password_hash) 
      VALUES ($1, $2, $3, $4) 
      RETURNING user_id, email, first_name, last_name
    `;
    console.log('Executing user insert query for:', { email });
    const userResult = await client.query(userQuery, [
      first_name,
      last_name || null,
      email,
      password_hash,
    ]);
    const newUser = userResult.rows[0];
    console.log('User inserted:', { user_id: newUser.user_id, email: newUser.email });

    // Insert into the corresponding role table and retrieve the role-specific ID
    let role_id: number;
    if (role === 'instructor') {
      console.log('Inserting instructor record for user_id:', newUser.user_id);
      const instructorResult = await client.query(
        `INSERT INTO instructors (user_id) VALUES ($1) RETURNING instructor_id as role_id`,
        [newUser.user_id]
      );
      role_id = instructorResult.rows[0].role_id;
    } else {
      console.log('Inserting student record for user_id:', newUser.user_id);
      const studentResult = await client.query(
        `INSERT INTO students (user_id) VALUES ($1) RETURNING student_id as role_id`,
        [newUser.user_id]
      );
      role_id = studentResult.rows[0].role_id;
    }

    await client.query('COMMIT');
    console.log('Transaction committed for user:', { email });
    return {
      user_id: newUser.user_id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      role: role,
      role_id: role_id
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', error);
    throw error;
  } finally {
    client.release();
    console.log('Database client released for user creation.');
  }
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  console.log('Searching for user by email:', { email });
  try {
    const userQuery = `SELECT * FROM users WHERE email = $1`;
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      console.log('No user found for email:', { email });
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
      console.log('User exists but has no role assigned:', { email });
      return null;
    }
    
    console.log('User found for email:', { email, user_id: result.rows[0].user_id });
    return result.rows[0] as UserWithPassword;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
}

export async function findUserById(userId: number): Promise<User | null> {
  console.log('Searching for user by ID:', { userId });
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
      console.log('No user found with ID or user has no role:', { userId });
      return null;
    }
    
    console.log('User found with ID:', { userId });
    return result.rows[0] as User;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
}

export async function validateUserPassword(user: UserWithPassword, password: string): Promise<boolean> {
  console.log('Validating password for user:', { email: user.email });
  try {
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('Password validation result for user:', { email: user.email, isValid });
    return isValid;
  } catch (error) {
    console.error('Error validating password for user:', { email: user.email, error });
    throw error;
  }
}