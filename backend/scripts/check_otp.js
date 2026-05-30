#!/usr/bin/env node
require('dotenv').config();
const db = require('../src/models/db');

const normalizePhone = (phone) => {
  if (!phone) return '';
  const raw = String(phone).trim().replace(/\s+/g, '');
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0') && raw.length === 10) return `+233${raw.slice(1)}`;
  return raw;
};

const phone = process.argv[2];
if (!phone) {
  console.error('Usage: node check_otp.js <phone>');
  process.exit(2);
}

(async () => {
  try {
    const normalized = normalizePhone(phone);
    const q = await db.query('SELECT id, verified, attempts, expires_at, created_at FROM sms_verifications WHERE phone=$1 ORDER BY created_at DESC LIMIT 5', [normalized]);
    console.log('Found', q.rows.length, 'records for', normalized);
    q.rows.forEach(r => console.log(r));
    process.exit(0);
  } catch (err) {
    console.error('Failed to query:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
