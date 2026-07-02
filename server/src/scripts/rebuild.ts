import pool from '../config/db';
import fs from 'fs';
import path from 'path';

async function rebuild() {
  try {
    console.log("Dropping public schema...");
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    
    console.log("Reading schema.sql...");
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log("Applying schema.sql...");
    await pool.query(schema);
    
    console.log("Database successfully rebuilt!");
    process.exit(0);
  } catch (error) {
    console.error("Error rebuilding DB:", error);
    process.exit(1);
  }
}

rebuild();
