import { defineConfig } from 'drizzle-kit';
import { getPoolConfig } from './connection';

const pool = getPoolConfig();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: pool.connectionString
    ? { url: pool.connectionString }
    : {
        host: pool.host!,
        port: pool.port,
        user: pool.user,
        password: pool.password as string,
        database: pool.database!,
        ssl: Boolean(pool.ssl),
      },
});
