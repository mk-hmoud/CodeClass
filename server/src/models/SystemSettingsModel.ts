import pool from '../config/db';
import logger from '../config/logger';

export const getMaintenanceMode = async (): Promise<boolean> => {
  const { rows } = await pool.query(
    'SELECT maintenance_mode FROM system_settings WHERE id = 1'
  );
  return rows[0]?.maintenance_mode ?? false;
};

export const setMaintenanceMode = async (enabled: boolean): Promise<void> => {
  const functionName = 'setMaintenanceMode';
  logger.info({ fn: functionName, enabled }, `Setting maintenance_mode to ${enabled}`);
  await pool.query(
    'UPDATE system_settings SET maintenance_mode = $1, updated_at = now() WHERE id = 1',
    [enabled]
  );
};
