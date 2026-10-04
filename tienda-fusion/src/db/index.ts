import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { getPoolConfig } from './connection';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      ...getPoolConfig(),
      // Hosting compartido: pocas conexiones; Neon/Supabase limitan las conexiones simultáneas
      max: Number(process.env.DB_POOL_MAX) || 5,
      idleTimeoutMillis: 30000,
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
