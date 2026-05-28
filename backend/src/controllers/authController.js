const db = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const sms = require('./smsController');

const ALLOWED_ROLES = new Set(['casher', 'manager', 'saler', 'owner']);

const normalizePhone = (phone) => {
  if (!phone) return null;
  const raw = String(phone).trim().replace(/\s+/g, '');
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0') && raw.length === 10) return `+233${raw.slice(1)}`;
  return raw;
};

const register = async (req, res) => {
  const { name, email, password, role = 'casher', phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const normalizedRole = String(role || 'casher').toLowerCase();
  if (!ALLOWED_ROLES.has(normalizedRole)) {
    return res.status(400).json({ error: 'Invalid role selected' });
  }
  const normalizedPhone = normalizePhone(phone);
  try {
    const userExists = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (userExists.rows.length) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users(name,email,password,role,phone,phone_verified) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,email,role,phone,phone_verified',
      [name, email, hash, normalizedRole, normalizedPhone, false]
    );
    const user = result.rows[0];
    // If phone provided, generate and send verification code
    if (normalizedPhone) {
      try {
        await sms.generateAndSendCode(normalizedPhone, 'signup');
      } catch (e) {
        console.warn('Failed to send signup SMS', e.message || e);
      }
    }
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await db.query('SELECT id,name,email,password,role FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const verifyPhone = async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });
  try {
    const smsCtrl = require('./smsController');
    const r = await smsCtrl.verifyCodeInternal(phone, code);
    if (!r.ok) return res.status(400).json({ error: r.reason || 'Invalid code' });
    // mark user phone_verified true for matching user
    await db.query('UPDATE users SET phone_verified=true WHERE phone=$1', [phone]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verify phone failed' });
  }
};

module.exports = { register, login, verifyPhone };
