const db = require('../models/db');
const bcrypt = require('bcrypt');
const axios = require('axios');

const SEND_EXPIRY_MINUTES = 15;

const normalizePhone = (phone) => {
  if (!phone) return '';
  const raw = String(phone).trim().replace(/\s+/g, '');
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0') && raw.length === 10) return `+233${raw.slice(1)}`;
  return raw;
};

const formatRecipientForHubtel = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  return normalized.startsWith('+') ? normalized.slice(1) : normalized;
};

const getHubtelUrl = () => {
  return process.env.HUBTEL_API_URL || 'https://api.hubtel.com/v1/messages';
};

const isProduction = () => process.env.NODE_ENV === 'production';

const buildHubtelRequest = (phone, content) => {
  const normalizedPhone = formatRecipientForHubtel(phone);
  const baseUrl = getHubtelUrl();
  if (!baseUrl) {
    throw new Error('Hubtel API URL is not configured');
  }

  const apiKey = process.env.HUBTEL_API_KEY;
  const clientId = process.env.HUBTEL_SMS_CLIENT_ID;
  const clientSecret = process.env.HUBTEL_SMS_CLIENT_SECRET;
  const sender = process.env.HUBTEL_SENDER || process.env.HUBTEL_SMS_FROM || 'STORE';
  const url = new URL(baseUrl);

  if (apiKey) {
    const request = {
      url: url.toString(),
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      data: {
        to: normalizedPhone,
        from: sender,
        content,
      },
    };
    return request;
  }

  if (isProduction()) {
    throw new Error('HUBTEL_API_KEY is required in production');
  }

  if (!(clientId && clientSecret)) {
    throw new Error('Hubtel credentials are not configured');
  }

  const request = {
    url: url.toString(),
    method: 'get',
    params: {
      clientid: clientId,
      clientsecret: clientSecret,
      from: sender,
      to: normalizedPhone,
      content,
    },
    data: {},
  };

  return request;
};

const buildHubtelFallbackRequests = (phone, content) => {
  const normalizedPhone = formatRecipientForHubtel(phone);
  const baseUrl = getHubtelUrl();
  const otpBase = process.env.HUBTEL_OTP_API_URL;
  const sender = process.env.HUBTEL_SENDER || process.env.HUBTEL_SMS_FROM || 'STORE';
  const clientId = process.env.HUBTEL_SMS_CLIENT_ID;
  const clientSecret = process.env.HUBTEL_SMS_CLIENT_SECRET;
  const apiKey = process.env.HUBTEL_API_KEY;
  const requestList = [];

  // Prefer Hubtel OTP API when configured (transactional OTP endpoint)
  if (otpBase) {
    requestList.push({
      label: 'otp-api',
      request: {
        url: `${otpBase}/v1/otp/send`,
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        data: {
          to: normalizedPhone,
          from: sender,
          content,
        },
      },
    });
    // If OTP API is available prefer it; return early if apiKey present to keep auth behavior consistent
    if (apiKey) return requestList;
  }

  if (apiKey) {
    requestList.push({
      label: 'bearer-api-key',
      request: {
        url: baseUrl,
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        data: {
          to: normalizedPhone,
          from: sender,
          content,
        },
      },
    });
    return requestList;
  }

  if (clientId && clientSecret) {
    requestList.push({
      label: 'query-client-secret',
      request: {
        url: baseUrl,
        method: 'get',
        params: {
          clientid: clientId,
          clientsecret: clientSecret,
          from: sender,
          to: normalizedPhone,
          content,
        },
      },
    });

    requestList.push({
      label: 'basic-client-secret',
      request: {
        url: baseUrl,
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        auth: {
          username: clientId,
          password: clientSecret,
        },
        data: {
          from: sender,
          to: normalizedPhone,
          content,
        },
      },
    });
  }

  return requestList;
};

const sendHubtelMessage = async (phone, content) => {
  const candidates = buildHubtelFallbackRequests(phone, content);
  if (!candidates.length) {
    throw new Error('Hubtel credentials are not configured');
  }

  let lastError = null;
  for (const { label, request } of candidates) {
    try {
      const resp = await axios.request(request);
      if (resp.status >= 200 && resp.status < 300) {
        return { ok: true, label };
      }
      lastError = new Error(`Hubtel returned status ${resp.status}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(getProviderError(lastError));
};

const queryWithClient = async (client, text, params) => {
  if (client) return client.query(text, params);
  return db.query(text, params);
};

const getProviderError = (err, fallback = 'SMS provider error') => {
  const data = err && err.response && err.response.data;
  if (data && typeof data === 'object') {
    return data.statusDescription || data.message || fallback;
  }
  return err && err.message ? err.message : fallback;
};

const getSmsDiagnostics = () => ({
  hubtelUrl: getHubtelUrl(),
  hubtelOtpUrl: process.env.HUBTEL_OTP_API_URL || null,
  hasApiKey: Boolean(process.env.HUBTEL_API_KEY),
  hasClientId: Boolean(process.env.HUBTEL_SMS_CLIENT_ID),
  hasClientSecret: Boolean(process.env.HUBTEL_SMS_CLIENT_SECRET),
  hasSender: Boolean(process.env.HUBTEL_SENDER || process.env.HUBTEL_SMS_FROM),
  transport: process.env.HUBTEL_OTP_API_URL
    ? 'otp-api'
    : (process.env.HUBTEL_API_KEY
      ? 'bearer-api-key'
      : (isProduction()
        ? 'production-api-key-required'
        : (process.env.HUBTEL_SMS_CLIENT_ID && process.env.HUBTEL_SMS_CLIENT_SECRET ? 'query-client-secret' : 'unconfigured'))),
});

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
  const { dbClient = null, forceResend = false } = options;
  const normalizedPhone = normalizePhone(phone);
  const latestRecord = await getLatestCodeRecord(normalizedPhone, purpose, dbClient);
  if (!forceResend && latestRecord && !latestRecord.verified && new Date(latestRecord.expires_at) > new Date()) {
    return {
      ok: true,
      sent: false,
      reused: true,
      reason: 'existing_unexpired_code',
    };
  }

  if (forceResend) {
    // Keep only the newest code valid by removing unexpired unverified ones before sending a new OTP.
    await queryWithClient(
      dbClient,
      'DELETE FROM sms_verifications WHERE phone=$1 AND purpose=$2 AND verified=false AND expires_at > NOW()',
      [normalizedPhone, purpose]
    );
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = await bcrypt.hash(code, 10);
  const message = `Your verification code is ${code}. It expires in ${SEND_EXPIRY_MINUTES} minutes.`;

  try {
    const result = await sendHubtelMessage(normalizedPhone, message);
    if (result && result.ok) {
      const expires_at = new Date(Date.now() + SEND_EXPIRY_MINUTES * 60 * 1000);
      await queryWithClient(dbClient, 'INSERT INTO sms_verifications(phone,code_hash,purpose,expires_at) VALUES($1,$2,$3,$4)', [normalizedPhone, hash, purpose, expires_at]);
      return { ok: true, sent: true, transport: result.label };
    }
    throw new Error('SMS provider error');
  } catch (err) {
    throw new Error(getProviderError(err));
  }
};

const sendTextMessage = async (phone, content) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { ok: false, sent: false, reason: 'no_phone' };

  try {
    const result = await sendHubtelMessage(normalizedPhone, content);
    return { ok: true, sent: Boolean(result && result.ok), transport: result && result.label ? result.label : null };
  } catch (err) {
    throw new Error(getProviderError(err));
  }
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
  const { phone, purpose = 'verification', forceResend = false } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  try {
    const result = await generateAndSendCode(phone, purpose, { forceResend: Boolean(forceResend) });
    if (result.reused) {
      return res.json({ ok: true, message: 'A verification code is already active for this phone. Please wait for it to expire before requesting another SMS.' });
    }
    if (result.sent === false) return res.json({ ok: true, message: 'Code generated (not sent, Hubtel URL not set)' });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    if (String(err.message || '').includes('Hubtel credentials are not configured')) {
      return res.status(500).json({ error: 'SMS is not configured. Set HUBTEL_API_KEY.' });
    }
    res.status(500).json({ error: err.message || 'Failed to send code' });
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

const smsConfig = (req, res) => {
  res.json({ ok: true, ...getSmsDiagnostics() });
};

module.exports = { sendVerification, verifyCode, smsConfig, generateAndSendCode, verifyCodeInternal, sendTextMessage, getSmsDiagnostics };
