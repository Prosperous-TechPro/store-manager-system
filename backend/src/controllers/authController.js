const db = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const sms = require('./smsController');

const ALLOWED_ROLES = new Set(['casher', 'manager', 'saler', 'ceo', 'admin']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GH_PHONE_REGEX = /^(?:\+233|0)\d{9}$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizePhone = (phone) => {
  if (!phone) return null;
  const raw = String(phone).trim().replace(/\s+/g, '');
  if (raw.startsWith('+233') && /^\+233\d{9}$/.test(raw)) return raw;
  if (raw.startsWith('0') && raw.length === 10) return `+233${raw.slice(1)}`;
  return raw;
};

const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase();
  return value === 'owner' ? 'ceo' : value;
};

const issueAuthSession = (user) => {
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      phone: user.phone,
    },
  };
};

const isValidEmail = (email) => EMAIL_REGEX.test(String(email || '').trim());

const isValidPhone = (phone) => GH_PHONE_REGEX.test(String(phone || '').trim().replace(/\s+/g, ''));

const getApprovalError = (role) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'manager') {
    return 'Manager account is waiting for CEO approval';
  }
  return 'Account is waiting for manager or CEO approval';
};

const register = async (req, res) => {
  const { name, email, password, role = 'casher', phone } = req.body;
  if (!name || !email || !password || !phone) return res.status(400).json({ error: 'Name, email, password, and phone are required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  const normalizedRole = normalizeRole(role || 'casher');
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  if (!ALLOWED_ROLES.has(normalizedRole)) {
    return res.status(400).json({ error: 'Invalid role selected' });
  }
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (!isValidPhone(normalizedPhone)) {
    return res.status(400).json({ error: 'Enter a valid Ghana phone number' });
  }
  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Valid phone number is required' });
  }
  try {
    const userExists = await db.query('SELECT id FROM users WHERE lower(email)=lower($1)', [normalizedEmail]);
    if (userExists.rows.length) return res.status(409).json({ error: 'Email already registered' });
    const phoneExists = await db.query('SELECT id FROM users WHERE phone=$1', [normalizedPhone]);
    if (phoneExists.rows.length) return res.status(409).json({ error: 'Phone number already registered' });
    if (normalizedRole === 'ceo') {
      const ceoCountResult = await db.query(
        "SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL AND lower(role) IN ('ceo','owner')"
      );
      const ceoCount = ceoCountResult.rows[0]?.total || 0;
      if (ceoCount >= 3) {
        return res.status(403).json({ error: 'cant create account, consult the manager' });
      }
    }
    const hash = await bcrypt.hash(password, 10);
    const approved = normalizedRole === 'ceo';
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO users(name,email,password,role,phone,phone_verified,approved) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,email,role,phone,phone_verified,approved',
        [name, normalizedEmail, hash, normalizedRole, normalizedPhone, false, approved]
      );
      const user = result.rows[0];

      const smsResult = await sms.generateAndSendCode(normalizedPhone, 'signup', { dbClient: client });
      if (!smsResult.sent) {
        throw new Error(smsResult.reused ? 'A verification code is already active for this phone' : 'Failed to send signup SMS');
      }

      await client.query('COMMIT');
      return res.status(201).json({
        ...user,
        verification_required: true,
        approval_required: !approved,
        approval_required_by: !approved ? (normalizedRole === 'manager' ? 'ceo' : 'manager_or_ceo') : null,
      });
    } catch (sendErr) {
      await client.query('ROLLBACK');
      console.warn('Failed to send signup SMS', sendErr.message || sendErr);
      return res.status(502).json({ error: 'We could not send the verification SMS. Account was not created.' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  try {
    const normalizedEmail = normalizeEmail(email);
    const result = await db.query('SELECT id,name,email,password,role,phone,phone_verified,approved,deleted_at FROM users WHERE lower(email)=lower($1)', [normalizedEmail]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.deleted_at) return res.status(403).json({ error: 'Account has been deleted' });
    if (!user.approved) return res.status(403).json({ error: getApprovalError(user.role), approval_required: true });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const session = issueAuthSession(user);
    res.json(session);
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
    const result = await db.query('SELECT id,name,email,role,phone,approved FROM users WHERE phone=$1', [normalizedPhone]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Account not found' });
    if (!user.approved) {
      return res.status(403).json({
        error: getApprovalError(user.role),
        approval_required: true,
      });
    }
    const session = issueAuthSession(user);
    res.json({
      ok: true,
      ...session,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verify phone failed' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
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

    if (!isValidEmail(nextEmail)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (!isValidPhone(nextPhone)) return res.status(400).json({ error: 'Enter a valid Ghana phone number' });

    // Only password changes require the current password.
    // Name, email, and phone updates are saved directly or confirmed via OTP.
    if (passwordChanged && !currentPassword) {
      return res.status(400).json({ error: 'Current password is required to confirm password changes' });
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
    const targetResult = await db.query('SELECT id,name,email,role,phone,phone_verified,created_at FROM users WHERE id=$1', [targetId]);
    const target = targetResult.rows[0];
    if (!target) return res.status(404).json({ error: 'User not found' });

    const report = {
      type: 'user_deletion',
      deleted_user: {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        phone: target.phone,
        phone_verified: target.phone_verified,
        created_at: target.created_at,
      },
      deleted_by: req.user.id,
      delete_reason: String(reason).trim(),
      deleted_at: new Date().toISOString(),
    };

    await db.query(
      `DELETE FROM users
       WHERE id=$1
       RETURNING id`,
      [targetId]
    );

    const recipients = await db.query(
      `SELECT phone
       FROM users
       WHERE lower(role) IN ('ceo','owner')
         AND phone IS NOT NULL
         AND phone <> ''
       ORDER BY created_at ASC`
    );

    const reportText = `Deleted account report: ${target.name} (${target.email}) | Role: ${target.role} | Deleted by: ${req.user.id} | Reason: ${report.delete_reason}`;
    const deliveryResults = [];
    for (const recipient of recipients.rows) {
      try {
        const sent = await sms.sendTextMessage(recipient.phone, reportText);
        deliveryResults.push({ phone: recipient.phone, sent: Boolean(sent && sent.sent) });
      } catch (sendErr) {
        console.warn('Failed to send deleted account report', sendErr && sendErr.message);
        deliveryResults.push({ phone: recipient.phone, sent: false });
      }
    }

    res.json({
      ok: true,
      user: report.deleted_user,
      report,
      report_delivered_to: deliveryResults,
      delete_reason: report.delete_reason,
      deleted_by: req.user.id,
    });
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
    const result = await db.query('SELECT id,name,email,role,phone,approved,deleted_at FROM users WHERE lower(email)=lower($1)', [normalizedEmail]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Account not found' });
    if (user.deleted_at) return res.status(403).json({ error: 'Account has been deleted' });
    if (!user.approved) return res.status(403).json({ error: getApprovalError(user.role), approval_required: true });
    if (!user.phone) return res.status(400).json({ error: 'No phone number available for this account' });
    const r = await sms.verifyCodeInternal(user.phone, code, 'password_reset');
    if (!r.ok) return res.status(400).json({ error: r.reason || 'Invalid code' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password=$1 WHERE id=$2', [hash, user.id]);
    const session = issueAuthSession(user);
    res.json({
      ok: true,
      ...session,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reset password failed' });
  }
};

module.exports = { register, login, verifyPhone, forgotPassword, resetPassword, getMe, updateMe, verifyMeUpdate, deleteAccount };
