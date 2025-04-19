import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'mhmd',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'codingplatform',
  password: process.env.DB_PASSWORD || '1234',
  port: Number(process.env.DB_PORT) || 5432,
});

export default pool;