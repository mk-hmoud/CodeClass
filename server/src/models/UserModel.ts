import pool from "../config/db";
import logger from "../config/logger";

/**
 * Only the delete path lives here, used by AdminController.
 *
 * This file also held createUser, getUserById and getUserByEmail, reached only
 * through an unmounted UserRoutes. They were written against a `username`
 * column the schema has never had, so they would have failed on first use --
 * the same stale assumption that broke every assignment export. User creation
 * belongs to AuthModel.createUser, which hashes the password and assigns a
 * role; lookups belong to AuthModel.findUserById / findUserByEmail.
 */
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
