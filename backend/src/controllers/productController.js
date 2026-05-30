const db = require('../models/db');

const listProducts = async (req, res) => {
  try {
    const result = await db.query('SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id ORDER BY p.name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM products WHERE id=$1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getProductByBarcode = async (req, res) => {
  const barcode = String(req.params.barcode || '').trim();
  if (!barcode) return res.status(400).json({ error: 'Barcode is required' });

  try {
    const result = await db.query(
      'SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE lower(p.barcode) = lower($1) LIMIT 1',
      [barcode]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'No product found for that barcode' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const createProduct = async (req, res) => {
  const { name, barcode, category, cost_price, selling_price, quantity, supplier_id, expiry_date, reorder_level } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO products(name, barcode, category, cost_price, selling_price, quantity, supplier_id, expiry_date, reorder_level)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, barcode, category, cost_price, selling_price, quantity || 0, supplier_id || null, expiry_date || null, reorder_level || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const keys = Object.keys(fields);
  if (!keys.length) return res.status(400).json({ error: 'No fields' });
  const set = keys.map((k, i) => `${k}=$${i + 1}`).join(', ');
  const values = keys.map(k => fields[k]);
  try {
    const result = await db.query(`UPDATE products SET ${set} WHERE id=$${keys.length + 1} RETURNING *`, [...values, id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT id, expiry_date FROM products WHERE id=$1', [id]);
    const product = result.rows[0];
    if (!product) return res.status(404).json({ error: 'Not found' });

    const role = req.user?.role === 'owner' ? 'ceo' : req.user?.role;

    await db.query('DELETE FROM products WHERE id=$1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { listProducts, getProduct, getProductByBarcode, createProduct, updateProduct, deleteProduct };
