#!/usr/bin/env node
require('dotenv').config();
const db = require('../src/models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const name = process.argv[2];
const email = process.argv[3];
const phone = process.argv[4];
const password = process.argv[5];
const role = process.argv[6] || 'casher';

if (!name || !email || !phone || !password) {
  console.error('Usage: node create_user_noninteractive.js <name> <email> <phone> <password> [role]');
  process.exit(2);
}

(async () => {
  try {
    const hash = await bcrypt.hash(password, 10);
    const normalizedPhone = (phone.startsWith('+') ? phone : (phone.startsWith('0') && phone.length===10 ? `+233${phone.slice(1)}` : phone));
    // Upsert
    const exist = await db.query('SELECT id FROM users WHERE lower(email)=lower($1) OR phone=$2', [email, normalizedPhone]);
    if (exist.rows.length) {
      const id = exist.rows[0].id;
      // keep phone unverified on creation so the user can verify via OTP
      await db.query(`UPDATE users SET name=$1, password=$2, role=$3, phone=$4, phone_verified=false, approved=true, deleted_at=null WHERE id=$5`, [name, hash, role, normalizedPhone, id]);
      console.log(`Updated existing user id=${id}`);
    } else {
      const res = await db.query(`INSERT INTO users(name,email,password,role,phone,phone_verified,approved,created_at) VALUES($1,$2,$3,$4,$5,false,true,NOW()) RETURNING id`, [name, email, hash, role, normalizedPhone]);
      console.log(`Created user id=${res.rows[0].id}`);
    }
    const r = await db.query('SELECT id,name,email,role,phone FROM users WHERE lower(email)=lower($1)', [email]);
    const user = r.rows[0];

    // Attempt to send a signup OTP via Hubtel if configured; otherwise insert a test OTP and print it.
    try {
      if (process.env.HUBTEL_API_KEY) {
        const smsCtrl = require('../src/controllers/smsController');
        const sendResult = await smsCtrl.generateAndSendCode(user.phone, 'signup');
        if (sendResult && sendResult.sent) {
          console.log('Signup OTP sent via Hubtel to', user.phone);
        } else if (sendResult && sendResult.code) {
          // In some dev setups the helper returns code for testing
          console.log('Generated signup OTP (dev):', sendResult.code);
        } else {
          console.log('Signup OTP generation completed but not sent (provider returned false)');
        }
      } else {
        // No Hubtel key — insert a test OTP and print it so the user can verify immediately.
        const bcrypt = require('bcrypt');
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const hash = await bcrypt.hash(code, 10);
        const expires_at = new Date(Date.now() + 10 * 60 * 1000);
        await db.query('INSERT INTO sms_verifications(phone,code_hash,purpose,expires_at,created_at) VALUES($1,$2,$3,$4,NOW())', [user.phone, hash, 'signup', expires_at]);
        console.log('Hubtel not configured — inserted test signup OTP for', user.phone);
        console.log('TEST SIGNUP OTP:', code);
      }
    } catch (err) {
      console.warn('Failed to generate/send signup OTP:', err && err.message ? err.message : err);
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });
    console.log('\n---- Account ----');
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Name:', name);
    console.log('Role:', role);
    console.log('JWT:', token);
    console.log('-----------------');
    process.exit(0);
  } catch (err) {
    console.error('Error creating user:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
