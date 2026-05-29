const db = require('../models/db');

const expiryAlerts = async (req, res) => {
  try {
    const result = await db.query(`SELECT id,name,quantity,expiry_date,
      CASE
        WHEN expiry_date <= NOW()::date THEN 'expired'
        WHEN expiry_date <= (NOW()::date + INTERVAL '1 month') THEN 'in_1_month'
        WHEN expiry_date <= (NOW()::date + INTERVAL '2 months') THEN 'in_2_months'
        WHEN expiry_date <= (NOW()::date + INTERVAL '3 months') THEN 'in_3_months'
        ELSE 'ok'
      END as status
      FROM products WHERE expiry_date IS NOT NULL ORDER BY expiry_date`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const missingReport = async (req, res) => {
  try {
    const q = `SELECT m.*, p.name as product_name FROM missing_products m JOIN products p ON m.product_id=p.id ORDER BY m.date DESC`;
    const result = await db.query(q);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { expiryAlerts, missingReport };
