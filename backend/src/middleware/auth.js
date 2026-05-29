const jwt = require('jsonwebtoken');
const db = require('../models/db');

const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid token' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query('SELECT id, role, deleted_at FROM users WHERE id=$1', [payload.id]);
    const user = result.rows[0];
    if (!user || user.deleted_at) return res.status(401).json({ error: 'Account is no longer active' });
    req.user = { id: user.id, role: user.role === 'owner' ? 'ceo' : user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (roles = []) => (req, res, next) => {
  if (!roles.length) return next();
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

module.exports = { authenticate, authorize };
