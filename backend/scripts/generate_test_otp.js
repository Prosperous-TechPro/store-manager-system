#!/usr/bin/env node
require('dotenv').config();
const db = require('../src/models/db');
const bcrypt = require('bcrypt');

const SEND_EXPIRY_MINUTES = 10;

const normalizePhone = (phone) => {
  if (!phone) return '';
  const raw = String(phone).trim().replace(/\s+/g, '');
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0') && raw.length === 10) return `+233${raw.slice(1)}`;
  return raw;
};

const phone = process.argv[2];
const purpose = process.argv[3] || 'verification';
if (!phone) {
  console.error('Usage: node generate_test_otp.js <phone> [purpose]');
  process.exit(2);
}

(async () => {
  try {
    const normalized = normalizePhone(phone);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(code, 10);
    const expires_at = new Date(Date.now() + SEND_EXPIRY_MINUTES * 60 * 1000);
    await db.query('INSERT INTO sms_verifications(phone,code_hash,purpose,expires_at,created_at) VALUES($1,$2,$3,$4,NOW())', [normalized, hash, purpose, expires_at]);
    console.log('Inserted test OTP for', normalized);
    console.log('TEST OTP CODE:', code);
    process.exit(0);
  } catch (err) {
    console.error('Failed to insert test OTP:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
