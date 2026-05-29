const db = require('../models/db');
const bcrypt = require('bcrypt');
const axios = require('axios');

const SEND_EXPIRY_MINUTES = 10;

const normalizePhone = (phone) => {
  if (!phone) return '';
  const raw = String(phone).trim().replace(/\s+/g, '');
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0') && raw.length === 10) return `+233${raw.slice(1)}`;
  return raw;
};

const getHubtelUrl = () => {
  return process.env.HUBTEL_API_URL || process.env.HUBTEL_SMS_BASE_URL || '';
};

const buildHubtelRequest = (phone, content) => {
  const normalizedPhone = normalizePhone(phone);
  const baseUrl = getHubtelUrl();
  if (!baseUrl) return null;

  const url = new URL(baseUrl);
  const isQueryAuthEndpoint = /smsc\.hubtel\.com/i.test(url.hostname) || url.searchParams.has('clientid') || url.searchParams.has('clientsecret');

  if (process.env.HUBTEL_API_KEY) {
    return {
      url: url.toString(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.HUBTEL_API_KEY}`,
      },
      body: {
        to: normalizedPhone,
        from: process.env.HUBTEL_SENDER || process.env.HUBTEL_SMS_FROM || 'STORE',
        content,
      },
      method: 'post',
    };
  }

  if (isQueryAuthEndpoint) {
    if (process.env.HUBTEL_SMS_CLIENT_ID) url.searchParams.set('clientid', process.env.HUBTEL_SMS_CLIENT_ID);
    if (process.env.HUBTEL_SMS_CLIENT_SECRET) url.searchParams.set('clientsecret', process.env.HUBTEL_SMS_CLIENT_SECRET);
    if (process.env.HUBTEL_SMS_FROM || process.env.HUBTEL_SENDER) {
      url.searchParams.set('from', process.env.HUBTEL_SENDER || process.env.HUBTEL_SMS_FROM || 'STORE');
    }

    return {
      url: url.toString(),
      headers: { 'Content-Type': 'application/json' },
      body: {
        to: normalizedPhone,
        content,
      },
      method: 'post',
    };
  }

  if (process.env.HUBTEL_BASIC_AUTH) {
    const val = process.env.HUBTEL_BASIC_AUTH;
    const authHeader = val.includes(':')
      ? `Basic ${Buffer.from(val).toString('base64')}`
      : val.toLowerCase().startsWith('basic ')
        ? val
        : `Basic ${val}`;
    return {
      url: url.toString(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: {
        to: normalizedPhone,
        from: process.env.HUBTEL_SENDER || process.env.HUBTEL_SMS_FROM || 'STORE',
        content,
      },
      method: 'post',
    };
  }

  if (process.env.HUBTEL_SMS_CLIENT_ID && process.env.HUBTEL_SMS_CLIENT_SECRET) {
    return {
      url: url.toString(),
      headers: { 'Content-Type': 'application/json' },
      body: {
        to: normalizedPhone,
        from: process.env.HUBTEL_SENDER || process.env.HUBTEL_SMS_FROM || 'STORE',
        content,
      },
      method: 'post',
    };
  }

  return {
    url: url.toString(),
    headers: { 'Content-Type': 'application/json' },
    body: {
      to: normalizedPhone,
      from: process.env.HUBTEL_SENDER || process.env.HUBTEL_SMS_FROM || 'STORE',
      content,
    },
    method: 'post',
  };
};

const queryWithClient = async (client, text, params) => {
  if (client) return client.query(text, params);
  return db.query(text, params);
};

const getAuthHeader = () => {
  if (process.env.HUBTEL_API_KEY) return { Authorization: `Bearer ${process.env.HUBTEL_API_KEY}` };
  if (process.env.HUBTEL_BASIC_AUTH) {
    const val = process.env.HUBTEL_BASIC_AUTH;
    if (val.includes(':')) {
      return { Authorization: `Basic ${Buffer.from(val).toString('base64')}` };
    }
    if (val.toLowerCase().startsWith('basic ')) return { Authorization: val };
    return { Authorization: `Basic ${val}` };
  }
  if (process.env.HUBTEL_SMS_CLIENT_ID && process.env.HUBTEL_SMS_CLIENT_SECRET) {
    const creds = `${process.env.HUBTEL_SMS_CLIENT_ID}:${process.env.HUBTEL_SMS_CLIENT_SECRET}`;
    return { Authorization: `Basic ${Buffer.from(creds).toString('base64')}` };
  }
  return {};
};

const getLatestCodeRecord = async (phone, purpose, dbClient = null) => {
  const normalizedPhone = normalizePhone(phone);
  const q = await queryWithClient(
    dbClient,
    'SELECT id, verified, expires_at, created_at FROM sms_verifications WHERE phone=$1 AND purpose=$2 ORDER BY created_at DESC LIMIT 1',
    [normalizedPhone, purpose]
  );
  return q.rows[0] || null;
};

// Internal helper: generate, store, and send code when Hubtel is configured.
const generateAndSendCode = async (phone, purpose = 'verification', options = {}) => {
  const { dbClient = null } = options;
  const normalizedPhone = normalizePhone(phone);
  const latestRecord = await getLatestCodeRecord(normalizedPhone, purpose, dbClient);
  if (latestRecord && !latestRecord.verified && new Date(latestRecord.expires_at) > new Date()) {
    return {
      ok: true,
      sent: false,
      reused: true,
      reason: 'existing_unexpired_code',
    };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = await bcrypt.hash(code, 10);
  const expires_at = new Date(Date.now() + SEND_EXPIRY_MINUTES * 60 * 1000);
  await queryWithClient(dbClient, 'INSERT INTO sms_verifications(phone,code_hash,purpose,expires_at) VALUES($1,$2,$3,$4)', [normalizedPhone, hash, purpose, expires_at]);

  const message = `Your verification code is ${code}. It expires in ${SEND_EXPIRY_MINUTES} minutes.`;

  const request = buildHubtelRequest(normalizedPhone, message);
  if (!request) {
    console.warn('Hubtel URL not configured; skipping actual send');
    return { ok: true, sent: false, code };
  }

  const resp = await axios.post(request.url, request.body, { headers: request.headers });
  if (resp.status >= 200 && resp.status < 300) {
    return { ok: true, sent: true };
  }
  throw new Error('SMS provider error');
};

const sendTextMessage = async (phone, content) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { ok: false, sent: false, reason: 'no_phone' };

  const request = buildHubtelRequest(normalizedPhone, content);
  if (!request) {
    console.warn('Hubtel URL not configured; skipping report send');
    return { ok: true, sent: false, reason: 'no_provider' };
  }

  const resp = await axios.post(request.url, request.body, { headers: request.headers });

  if (resp.status >= 200 && resp.status < 300) {
    return { ok: true, sent: true };
  }

  throw new Error('SMS provider error');
};

// Internal helper: verify a code for a phone; returns true if ok
const verifyCodeInternal = async (phone, code, purpose = null) => {
  const normalizedPhone = normalizePhone(phone);
  const queryText = purpose
    ? 'SELECT * FROM sms_verifications WHERE phone=$1 AND purpose=$2 ORDER BY created_at DESC LIMIT 1'
    : 'SELECT * FROM sms_verifications WHERE phone=$1 ORDER BY created_at DESC LIMIT 1';
  const queryParams = purpose ? [normalizedPhone, purpose] : [normalizedPhone];
  const q = await db.query(queryText, queryParams);
  const row = q.rows[0];
  if (!row) return { ok: false, reason: 'no_code' };
  if (row.verified) return { ok: false, reason: 'already_verified' };
  if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };
  const ok = await bcrypt.compare(code, row.code_hash);
  if (!ok) {
    await db.query('UPDATE sms_verifications SET attempts = attempts + 1 WHERE id=$1', [row.id]);
    return { ok: false, reason: 'invalid' };
  }
  await db.query('UPDATE sms_verifications SET verified=true WHERE id=$1', [row.id]);
  return { ok: true };
};

// Express handlers kept for compatibility
const sendVerification = async (req, res) => {
  const { phone, purpose = 'verification' } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  try {
    const result = await generateAndSendCode(phone, purpose);
    if (result.reused) {
      return res.json({ ok: true, message: 'A verification code is already active for this phone. Please wait for it to expire before requesting another SMS.' });
    }
    if (result.sent === false) return res.json({ ok: true, message: 'Code generated (not sent, Hubtel URL not set)' });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send code' });
  }
};

const verifyCode = async (req, res) => {
  const { phone, code, purpose } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });
  try {
    const r = await verifyCodeInternal(phone, code, purpose || 'verification');
    if (!r.ok) return res.status(400).json({ error: r.reason || 'Invalid' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

module.exports = { sendVerification, verifyCode, generateAndSendCode, verifyCodeInternal, sendTextMessage };
