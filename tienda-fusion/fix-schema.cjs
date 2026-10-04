const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
  ssl: false
});
async function fix() {
  try {
    await pool.query(`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS description text;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon text;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id integer;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category text DEFAULT 'General' NOT NULL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail text;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now() NOT NULL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price numeric(10, 2) DEFAULT '0' NOT NULL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
      
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
    `);
    console.log("Schema columns patched!");
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
fix();
