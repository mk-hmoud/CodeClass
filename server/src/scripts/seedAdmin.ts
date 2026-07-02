import 'dotenv/config';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import logger from '../config/logger';

async function seedAdmin() {
  logger.info("Starting admin seed script...");
  const client = await pool.connect();

  try {
    const password_hash = await bcrypt.hash('admin123', 10);
    const email = 'admin@codeclass.com';
    const username = 'admin';

    await client.query('BEGIN');

    // 1. Ensure admin role exists
    const roleRes = await client.query(`
      INSERT INTO roles (role_name) VALUES ('admin')
      ON CONFLICT (role_name) DO UPDATE SET role_name=EXCLUDED.role_name
      RETURNING role_id
    `);
    const roleId = roleRes.rows[0].role_id;

    // 2. Insert admin user
    const userRes = await client.query(`
      INSERT INTO users (username, password_hash, first_name, last_name, email)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING
      RETURNING user_id
    `, [username, password_hash, 'Admin', 'User', email]);

    if (userRes.rowCount === 0) {
      logger.info("Admin user already exists. Exiting.");
      await client.query('ROLLBACK');
      return;
    }

    const userId = userRes.rows[0].user_id;

    // 3. Assign role to user
    await client.query(`
      INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
    `, [userId, roleId]);

    await client.query('COMMIT');
    logger.info("Admin user created successfully!");
    logger.info(`Email: ${email}`);
    logger.info("Password: admin123");
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error }, "Error creating admin user:");
  } finally {
    client.release();
    process.exit(0);
  }
}

seedAdmin();
