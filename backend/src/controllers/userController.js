const db = require('../models/db');

const listUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id,name,email,role,phone,phone_verified,deleted_at,deleted_by,delete_reason,created_at FROM users ORDER BY COALESCE(deleted_at, created_at) DESC, created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { listUsers };