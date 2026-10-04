import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
async function main() {
  const pool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER,
    password: process.env.SQL_ADMIN_PASSWORD,
    database: process.env.SQL_DB_NAME,
  });
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;');
  console.log("Done");
  process.exit(0);
}
main();
