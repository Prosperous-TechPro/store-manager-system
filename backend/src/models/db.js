const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });

let initPromise = null;

const initSchema = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS delete_reason TEXT
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS account_update_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          password_hash TEXT,
          otp_phone TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    })();
  }
  return initPromise;
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initSchema,
};
