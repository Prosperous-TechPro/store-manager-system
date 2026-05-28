const db = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const sms = require('./smsController');

const ALLOWED_ROLES = new Set(['casher', 'manager', 'saler', 'owner', 'admin']);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizePhone = (phone) => {
  if (!phone) return null;
  const raw = String(phone).trim().replace(/\s+/g, '');
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0') && raw.length === 10) return `+233${raw.slice(1)}`;
  return raw;
};

const register = async (req, res) => {
  const { name, email, password, role = 'casher', phone } = req.body;
  if (!name || !email || !password || !phone) return res.status(400).json({ error: 'Name, email, password, and phone are required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  const normalizedRole = String(role || 'casher').toLowerCase();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  if (!ALLOWED_ROLES.has(normalizedRole)) {
    return res.status(400).json({ error: 'Invalid role selected' });
  }
  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Valid phone number is required' });
  }
  try {
    const userExists = await db.query('SELECT id FROM users WHERE lower(email)=lower($1)', [normalizedEmail]);
    if (userExists.rows.length) return res.status(409).json({ error: 'Email already registered' });
    const phoneExists = await db.query('SELECT id FROM users WHERE phone=$1', [normalizedPhone]);
    if (phoneExists.rows.length) return res.status(409).json({ error: 'Phone number already registered' });
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users(name,email,password,role,phone,phone_verified) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,email,role,phone,phone_verified',
      [name, normalizedEmail, hash, normalizedRole, normalizedPhone, false]
    );
    const user = result.rows[0];
    try {
      await sms.generateAndSendCode(normalizedPhone, 'signup');
    } catch (e) {
      console.warn('Failed to send signup SMS', e.message || e);
    }
    res.status(201).json({ ...user, verification_required: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const normalizedEmail = normalizeEmail(email);
    const result = await db.query('SELECT id,name,email,password,role,phone,phone_verified,deleted_at FROM users WHERE lower(email)=lower($1)', [normalizedEmail]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.deleted_at) return res.status(403).json({ error: 'Account has been deleted' });
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
    const r = await smsCtrl.verifyCodeInternal(phone, code, 'signup');
    if (!r.ok) return res.status(400).json({ error: r.reason || 'Invalid code' });
    const normalizedPhone = normalizePhone(phone);
    await db.query('UPDATE users SET phone_verified=true WHERE phone=$1', [normalizedPhone]);
    const result = await db.query('SELECT id,name,email,role,phone FROM users WHERE phone=$1', [normalizedPhone]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Account not found' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verify phone failed' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const normalizedEmail = normalizeEmail(email);
    const result = await db.query('SELECT id,email,phone FROM users WHERE lower(email)=lower($1)', [normalizedEmail]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Account not found' });
    if (!user.phone) return res.status(400).json({ error: 'No phone number on the account to send a reset code' });
    await sms.generateAndSendCode(user.phone, 'password_reset');
    res.json({ ok: true, message: 'Password reset code sent to the registered phone number' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Forgot password failed' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await db.query('SELECT id,name,email,role,phone,phone_verified,created_at,deleted_at FROM users WHERE id=$1', [req.user.id]);
    const user = result.rows[0];
    if (!user || user.deleted_at) return res.status(404).json({ error: 'Account not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load account' });
  }
};

const updateMe = async (req, res) => {
  const { name, email, phone, currentPassword, newPassword } = req.body;
  try {
    const existingResult = await db.query('SELECT id,name,email,password,role,phone,phone_verified,deleted_at FROM users WHERE id=$1', [req.user.id]);
    const existing = existingResult.rows[0];
    if (!existing || existing.deleted_at) return res.status(404).json({ error: 'Account not found' });

    const nextName = typeof name === 'string' && name.trim() ? name.trim() : existing.name;
    const nextEmail = typeof email === 'string' && email.trim() ? normalizeEmail(email) : existing.email;
    const nextPhone = typeof phone === 'string' && phone.trim() ? normalizePhone(phone) : existing.phone;
    const contactChanged = nextEmail !== existing.email || nextPhone !== existing.phone;
    const passwordChanged = Boolean(newPassword);

    if ((nextName !== existing.name || contactChanged || passwordChanged) && !currentPassword) {
      return res.status(400).json({ error: 'Current password is required to confirm account changes' });
    }

    if (currentPassword) {
      const currentOk = await bcrypt.compare(currentPassword, existing.password);
      if (!currentOk) return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (nextEmail !== existing.email) {
      const emailExists = await db.query('SELECT id FROM users WHERE lower(email)=lower($1) AND id <> $2', [nextEmail, existing.id]);
      if (emailExists.rows.length) return res.status(409).json({ error: 'Email already registered' });
    }
    if (nextPhone && nextPhone !== existing.phone) {
      const phoneExists = await db.query('SELECT id FROM users WHERE phone=$1 AND id <> $2', [nextPhone, existing.id]);
      if (phoneExists.rows.length) return res.status(409).json({ error: 'Phone number already registered' });
    }

    let nextPasswordHash = null;
    const nextPhoneVerified = nextPhone !== existing.phone ? false : existing.phone_verified;

    if (newPassword) {
      if (String(newPassword).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      nextPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    if (!contactChanged) {
      const result = await db.query(
        `UPDATE users
         SET name=$1,
             password=COALESCE($2, password)
         WHERE id=$3
         RETURNING id,name,email,role,phone,phone_verified,created_at`,
        [nextName, nextPasswordHash, existing.id]
      );

      return res.json({
        ...result.rows[0],
        password_updated: Boolean(nextPasswordHash),
        otp_required: false,
      });
    }

    const otpPhone = nextPhone !== existing.phone ? nextPhone : existing.phone;
    if (!otpPhone) {
      return res.status(400).json({ error: 'A phone number is required to verify email or phone changes' });
    }

    await db.query('DELETE FROM account_update_requests WHERE user_id=$1 AND verified=false', [existing.id]);
    await db.query(
      `INSERT INTO account_update_requests(user_id,name,email,phone,password_hash,otp_phone,expires_at)
       VALUES($1,$2,$3,$4,$5,$6, NOW() + INTERVAL '10 minutes')`,
      [existing.id, nextName, nextEmail, nextPhone, nextPasswordHash, otpPhone]
    );

    try {
      await sms.generateAndSendCode(otpPhone, 'profile_update');
    } catch (e) {
      console.warn('Failed to send profile update OTP', e.message || e);
    }

    res.json({
      ok: true,
      otp_required: true,
      otp_phone: otpPhone,
      message: 'We sent a verification code to confirm your email or phone change',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update account' });
  }
};

const verifyMeUpdate = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code required' });

  try {
    const pendingResult = await db.query(
      'SELECT id,user_id,name,email,phone,password_hash,otp_phone,expires_at FROM account_update_requests WHERE user_id=$1 AND verified=false ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    const pending = pendingResult.rows[0];
    if (!pending) return res.status(404).json({ error: 'No pending account update found' });
    if (new Date(pending.expires_at) < new Date()) return res.status(400).json({ error: 'Verification code has expired' });

    const verification = await sms.verifyCodeInternal(pending.otp_phone, code, 'profile_update');
    if (!verification.ok) return res.status(400).json({ error: verification.reason || 'Invalid verification code' });

    if (pending.email !== null && pending.email !== undefined) {
      const emailExists = await db.query('SELECT id FROM users WHERE lower(email)=lower($1) AND id <> $2', [pending.email, req.user.id]);
      if (emailExists.rows.length) return res.status(409).json({ error: 'Email already registered' });
    }
    if (pending.phone && pending.phone !== undefined) {
      const phoneExists = await db.query('SELECT id FROM users WHERE phone=$1 AND id <> $2', [pending.phone, req.user.id]);
      if (phoneExists.rows.length) return res.status(409).json({ error: 'Phone number already registered' });
    }

    const updateResult = await db.query(
      `UPDATE users
       SET name=$1,
           email=$2,
           phone=$3,
           password=COALESCE($4, password),
           phone_verified=CASE WHEN $3 IS DISTINCT FROM phone THEN true ELSE phone_verified END
       WHERE id=$5
       RETURNING id,name,email,role,phone,phone_verified,created_at`,
      [pending.name, pending.email, pending.phone, pending.password_hash, pending.user_id]
    );

    await db.query('UPDATE account_update_requests SET verified=true WHERE id=$1', [pending.id]);

    res.json({
      ...updateResult.rows[0],
      ok: true,
      otp_required: false,
      password_updated: Boolean(pending.password_hash),
      phone_verification_required: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify account update' });
  }
};

const deleteAccount = async (req, res) => {
  const targetId = Number(req.params.id);
  const { reason } = req.body;
  if (!targetId) return res.status(400).json({ error: 'Valid user id is required' });
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: 'Delete reason is required' });

  try {
    const targetResult = await db.query('SELECT id, deleted_at FROM users WHERE id=$1', [targetId]);
    const target = targetResult.rows[0];
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.deleted_at) return res.status(409).json({ error: 'User is already deleted' });

    const result = await db.query(
      `UPDATE users
       SET deleted_at=NOW(),
           deleted_by=$1,
           delete_reason=$2
       WHERE id=$3
       RETURNING id,name,email,role,phone,phone_verified,deleted_at,delete_reason,deleted_by,created_at`,
      [req.user.id, String(reason).trim(), targetId]
    );

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'Email, code, and new password are required' });
  if (String(newPassword).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  try {
    const normalizedEmail = normalizeEmail(email);
    const result = await db.query('SELECT id,email,phone FROM users WHERE lower(email)=lower($1)', [normalizedEmail]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Account not found' });
    if (!user.phone) return res.status(400).json({ error: 'No phone number available for this account' });
    const r = await sms.verifyCodeInternal(user.phone, code, 'password_reset');
    if (!r.ok) return res.status(400).json({ error: r.reason || 'Invalid code' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password=$1 WHERE id=$2', [hash, user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reset password failed' });
  }
};

module.exports = { register, login, verifyPhone, forgotPassword, resetPassword, getMe, updateMe, verifyMeUpdate, deleteAccount };
