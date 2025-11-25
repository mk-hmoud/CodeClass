import pool from "../config/db";
import logger from "../config/logger";

export interface Role {
  role_id?: number;
  role_name: string;
}

export const createRole = async (roleData: Role): Promise<number> => {
  const functionName = "createRole";
  try {
    logger.info({ functionName, roleName: roleData.role_name }, "Creating new role.");
    const query = `
      INSERT INTO roles (role_name)
      VALUES ($1)
      RETURNING role_id
    `;
    const result = await pool.query(query, [roleData.role_name]);
    const role_id: number = result.rows[0].role_id;
    logger.info({ functionName, role_id }, `Role created with ID: ${role_id}.`);
    return role_id;
  } catch (error) {
    logger.error({ functionName, roleName: roleData.role_name, error }, `Error creating role: ${error}`);
    throw error;
  }
};

export const getRoleById = async (role_id: number): Promise<Role> => {
  const functionName = "getRoleById";
  try {
    logger.info({ functionName, role_id }, `Fetching role with ID: ${role_id}.`);
    const query = `SELECT * FROM roles WHERE role_id = $1`;
    const result = await pool.query(query, [role_id]);
    if (result.rowCount === 0) {
      logger.warn({ functionName, role_id }, "Role not found.");
      throw new Error("Role not found");
    }
    logger.info({ functionName, role_id }, "Role fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logger.error({ functionName, role_id, error }, `Error fetching role: ${error}`);
    throw error;
  }
};

export const getAllRoles = async (): Promise<Role[]> => {
  const functionName = "getAllRoles";
  try {
    logger.info({ functionName }, "Fetching all roles.");
    const query = `SELECT * FROM roles`;
    const result = await pool.query(query);
    logger.info(
      { functionName, count: result.rowCount },
      `Fetched ${result.rowCount} roles.`
    );
    return result.rows;
  } catch (error) {
    logger.error({ functionName, error }, `Error fetching roles: ${error}`);
    throw error;
  }
};

export const assignRoleToUser = async (userId: number, role_id: number): Promise<void> => {
  const functionName = "assignRoleToUser";
  try {
    logger.info(
      { functionName, userId, role_id },
      `Assigning role ID ${role_id} to user ID ${userId}.`
    );
    const query = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
    `;
    await pool.query(query, [userId, role_id]);
    logger.info({ functionName, userId, role_id }, "Role assigned to user successfully.");
  } catch (error) {
    logger.error(
      { functionName, userId, role_id, error },
      `Error assigning role: ${error}`
    );
    throw error;
  }
};

export const getUserRoles = async (userId: number): Promise<Role[]> => {
  const functionName = "getUserRoles";
  try {
    logger.info(
      { functionName, userId },
      `Fetching roles for user ID ${userId}.`
    );
    const query = `
      SELECT r.*
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      WHERE ur.user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    logger.info(
      { functionName, userId, count: result.rowCount },
      `Fetched ${result.rowCount} roles for user.`
    );
    return result.rows;
  } catch (error) {
    logger.error(
      { functionName, userId, error },
      `Error fetching user roles: ${error}`
    );
    throw error;
  }
};
