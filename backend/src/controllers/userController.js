const db = require('../models/db');

const countActiveManagers = async (excludeUserId = null) => {
  const query = excludeUserId
    ? 'SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL AND lower(role) = \'manager\' AND id <> $1'
    : 'SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL AND lower(role) = \'manager\'';
  const params = excludeUserId ? [excludeUserId] : [];
  const result = await db.query(query, params);
  return result.rows[0]?.total || 0;
};

const listUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id,name,email,role,phone,phone_verified,approved,approved_at,approved_by,created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const listPendingUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id,name,email,role,phone,phone_verified,approved,approved_at,approved_by,created_at
       FROM users
       WHERE approved=false
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const approveUser = async (req, res) => {
  const targetId = Number(req.params.id);
  if (!targetId) return res.status(400).json({ error: 'Valid user id is required' });

  try {
    const targetResult = await db.query('SELECT id, role, approved FROM users WHERE id=$1', [targetId]);
    const target = targetResult.rows[0];
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (String(target.role || '').toLowerCase() === 'manager' && String(req.user.role || '').toLowerCase() !== 'ceo') {
      return res.status(403).json({ error: 'Manager accounts must be approved by CEO' });
    }
    if (String(target.role || '').toLowerCase() === 'manager') {
      const managerCount = await countActiveManagers(targetId);
      if (managerCount >= 2) {
        return res.status(403).json({ error: 'Only two manager accounts are allowed' });
      }
    }

    const result = await db.query(
      `UPDATE users
       SET approved=true,
           approved_at=NOW(),
           approved_by=$1
       WHERE id=$2
       RETURNING id,name,email,role,phone,phone_verified,approved,approved_at,approved_by,created_at`,
      [req.user.id, targetId]
    );

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

module.exports = { listUsers, listPendingUsers, approveUser };