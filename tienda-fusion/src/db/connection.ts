import type { PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración de conexión a PostgreSQL.
 * - Recomendado: DATABASE_URL (Neon, Supabase, etc.), p. ej.
 *   postgresql://usuario:clave@ep-xxx.neon.tech/fusion?sslmode=require
 * - Alternativa: variables SQL_HOST / SQL_PORT / SQL_USER / SQL_PASSWORD / SQL_DB_NAME (+ SQL_SSL=true)
 */
export const getPoolConfig = (): PoolConfig => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return {
    host: process.env.SQL_HOST,
    port: Number(process.env.SQL_PORT) || 5432,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: true } : false,
  };
};
