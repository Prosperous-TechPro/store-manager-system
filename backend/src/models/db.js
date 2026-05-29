const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });

let initPromise = null;

const initSchema = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'cashier',
          phone TEXT UNIQUE,
          phone_verified BOOLEAN DEFAULT FALSE,
          approved BOOLEAN DEFAULT FALSE,
          approved_at TIMESTAMP,
          approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          deleted_at TIMESTAMP,
          deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          delete_reason TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          contact TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          barcode TEXT,
          category TEXT,
          cost_price NUMERIC(12,2) DEFAULT 0,
          selling_price NUMERIC(12,2) DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          expiry_date DATE,
          supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
          reorder_level INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS sales (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          total_amount NUMERIC(12,2) DEFAULT 0,
          date TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id SERIAL PRIMARY KEY,
          sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
          quantity INTEGER NOT NULL,
          price NUMERIC(12,2) NOT NULL
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id SERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
          type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          date TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS missing_products (
          id SERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
          expected INTEGER NOT NULL,
          actual INTEGER NOT NULL,
          difference INTEGER NOT NULL,
          loss_value NUMERIC(12,2) DEFAULT 0,
          date TIMESTAMP DEFAULT NOW(),
          detected_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS sms_verifications (
          id SERIAL PRIMARY KEY,
          phone TEXT NOT NULL,
          code_hash TEXT NOT NULL,
          purpose TEXT,
          expires_at TIMESTAMP NOT NULL,
          verified BOOLEAN DEFAULT FALSE,
          attempts INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS delete_reason TEXT,
          ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
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

      await pool.query('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)');
      // Ensure existing CEO/owner users are marked approved
      try {
        await pool.query("UPDATE users SET approved=true, approved_at=NOW() WHERE lower(role)='ceo' OR lower(role)='owner'")
      } catch (e) {
        console.warn('Failed to auto-approve existing ceo/owner users', e && e.message)
      }
    })();
  }
  return initPromise;
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initSchema,
};
