const db = require('../models/db');

const listSuppliers = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, contact FROM suppliers ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const createSupplier = async (req, res) => {
  const { name, contact } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO suppliers(name, contact) VALUES($1, $2) RETURNING id, name, contact',
      [name.trim(), contact?.trim() || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateSupplier = async (req, res) => {
  const { id } = req.params;
  const { name, contact } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }

  try {
    const result = await db.query(
      'UPDATE suppliers SET name=$1, contact=$2 WHERE id=$3 RETURNING id, name, contact',
      [name.trim(), contact?.trim() || null, id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { listSuppliers, createSupplier, updateSupplier };