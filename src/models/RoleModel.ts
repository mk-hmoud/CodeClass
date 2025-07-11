import pool from "../config/db";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [RoleModel.ts] [${functionName}] ${message}`);
};

export interface Role {
  role_id?: number;
  role_name: string;
}

export const createRole = async (roleData: Role): Promise<number> => {
  const functionName = "createRole";
  try {
    logMessage(functionName, "Creating new role.");
    const query = `
      INSERT INTO roles (role_name)
      VALUES ($1)
      RETURNING role_id
    `;
    const result = await pool.query(query, [roleData.role_name]);
    const role_id: number = result.rows[0].role_id;
    logMessage(functionName, `Role created with ID: ${role_id}.`);
    return role_id;
  } catch (error) {
    logMessage(functionName, `Error creating role: ${error}`);
    throw error;
  }
};

export const getRoleById = async (role_id: number): Promise<Role> => {
  const functionName = "getRoleById";
  try {
    logMessage(functionName, `Fetching role with ID: ${role_id}.`);
    const query = `SELECT * FROM roles WHERE role_id = $1`;
    const result = await pool.query(query, [role_id]);
    if (result.rowCount === 0) {
      logMessage(functionName, "Role not found.");
      throw new Error("Role not found");
    }
    logMessage(functionName, "Role fetched successfully.");
    return result.rows[0];
  } catch (error) {
    logMessage(functionName, `Error fetching role: ${error}`);
    throw error;
  }
};

export const getAllRoles = async (): Promise<Role[]> => {
  const functionName = "getAllRoles";
  try {
    logMessage(functionName, "Fetching all roles.");
    const query = `SELECT * FROM roles`;
    const result = await pool.query(query);
    logMessage(functionName, `Fetched ${result.rowCount} roles.`);
    return result.rows;
  } catch (error) {
    logMessage(functionName, `Error fetching roles: ${error}`);
    throw error;
  }
};

export const assignRoleToUser = async (userId: number, role_id: number): Promise<void> => {
  const functionName = "assignRoleToUser";
  try {
    logMessage(functionName, `Assigning role ID ${role_id} to user ID ${userId}.`);
    const query = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
    `;
    await pool.query(query, [userId, role_id]);
    logMessage(functionName, "Role assigned to user successfully.");
  } catch (error) {
    logMessage(functionName, `Error assigning role: ${error}`);
    throw error;
  }
};

export const getUserRoles = async (userId: number): Promise<Role[]> => {
  const functionName = "getUserRoles";
  try {
    logMessage(functionName, `Fetching roles for user ID ${userId}.`);
    const query = `
      SELECT r.*
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      WHERE ur.user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    logMessage(functionName, `Fetched ${result.rowCount} roles for user.`);
    return result.rows;
  } catch (error) {
    logMessage(functionName, `Error fetching user roles: ${error}`);
    throw error;
  }
};
