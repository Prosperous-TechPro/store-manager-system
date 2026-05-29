const db = require('../models/db');

const listUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id,name,email,role,phone,phone_verified,approved,approved_at,approved_by,deleted_at,deleted_by,delete_reason,created_at FROM users ORDER BY COALESCE(deleted_at, created_at) DESC, created_at DESC'
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
      `SELECT id,name,email,role,phone,phone_verified,approved,approved_at,approved_by,deleted_at,created_at
       FROM users
       WHERE approved=false AND deleted_at IS NULL
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
    const targetResult = await db.query('SELECT id, role, approved, deleted_at FROM users WHERE id=$1', [targetId]);
    const target = targetResult.rows[0];
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.deleted_at) return res.status(409).json({ error: 'User has been deleted' });
    if (String(target.role || '').toLowerCase() === 'manager' && String(req.user.role || '').toLowerCase() !== 'ceo') {
      return res.status(403).json({ error: 'Manager accounts must be approved by CEO' });
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