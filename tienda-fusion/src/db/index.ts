import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export { pool };
export const db = drizzle(pool, { schema });

// Auto-initialize required operational tables if they don't exist yet
export const initDbTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamp DEFAULT now()
      );
    `);
  } catch (err: any) {
    // Non-blocking fallback
  }
};

// Attempt initial table creation safely
initDbTables().catch(() => {});
