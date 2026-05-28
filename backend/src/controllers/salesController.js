const db = require('../models/db');

const createSale = async (req, res) => {
  const { items } = req.body; // items: [{ product_id, quantity, price }]
  if (!items || !items.length) return res.status(400).json({ error: 'No items' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const saleRes = await client.query('INSERT INTO sales(user_id,total_amount,date) VALUES($1,$2,NOW()) RETURNING id,date', [req.user.id, 0]);
    const saleId = saleRes.rows[0].id;
    let total = 0;
    for (const it of items) {
      const lineTotal = it.price * it.quantity;
      total += lineTotal;
      await client.query('INSERT INTO sale_items(sale_id,product_id,quantity,price) VALUES($1,$2,$3,$4)', [saleId, it.product_id, it.quantity, it.price]);
      await client.query('UPDATE products SET quantity = quantity - $1 WHERE id=$2', [it.quantity, it.product_id]);
      await client.query('INSERT INTO stock_movements(product_id,type,quantity,date) VALUES($1,$2,$3,NOW())', [it.product_id, 'sale', it.quantity]);
    }
    await client.query('UPDATE sales SET total_amount=$1 WHERE id=$2', [total, saleId]);
    await client.query('COMMIT');
    res.status(201).json({ saleId, total, date: saleRes.rows[0].date });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (typeof client.release === 'function') {
      client.release();
    }
  }
};

const listSales = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM sales ORDER BY date DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createSale, listSales };
