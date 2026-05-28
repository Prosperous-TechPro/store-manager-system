require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sqlPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('SQL file not found at', sqlPath);
  process.exit(1);
}
const sql = fs.readFileSync(sqlPath, 'utf8');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const client = new Client({ connectionString });

(async () => {
  try {
    await client.connect();
    console.log('Connected. Running SQL...');
    await client.query(sql);
    console.log('SQL executed successfully.');
  } catch (err) {
    console.error('Error executing SQL:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
