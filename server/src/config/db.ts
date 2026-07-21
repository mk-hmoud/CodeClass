import { Pool } from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';
import logger from './logger';

dotenv.config({ path: resolve(__dirname, '../../../.env') });
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// node-postgres requires an error listener on the pool -- without one, an
// error on an idle client (e.g. a dropped backend connection) is an
// unhandled 'error' event and can crash the process. This was previously
// unhandled entirely.
pool.on('error', (err) => {
  logger.error(
    { fn: 'pool.error', error: err.message, stack: err.stack },
    `Unexpected error on idle Postgres client: ${err.message}`
  );
});

// Diagnostic: periodically log the pool's own view of its connection state.
// totalCount/idleCount/waitingCount are built into node-postgres's Pool.
// If waitingCount grows and stays high while idleCount is 0, the pool
// itself is the bottleneck; if idleCount is high but requests still hang,
// the issue is elsewhere.
setInterval(() => {
  logger.info(
    {
      fn: 'pool.diagnostics',
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    },
    `Pool state: total=${pool.totalCount} idle=${pool.idleCount} waiting=${pool.waitingCount}`
  );
}, 10000).unref();

export default pool;