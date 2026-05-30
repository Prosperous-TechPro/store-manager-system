const db = require('../models/db');

const createSale = async (req, res) => {
  const { items, amount, total_amount } = req.body; // items: [{ product_id, quantity, price }]
  const saleAmount = Number.parseFloat(amount ?? total_amount);
  const hasItems = Array.isArray(items) && items.length > 0;
  if (!hasItems && !Number.isFinite(saleAmount)) return res.status(400).json({ error: 'Sale amount is required' });
  if (Number.isFinite(saleAmount) && saleAmount < 0) return res.status(400).json({ error: 'Sale amount must be at least 0' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const saleRes = await client.query('INSERT INTO sales(user_id,total_amount,date) VALUES($1,$2,NOW()) RETURNING id,date', [req.user.id, hasItems ? 0 : saleAmount]);
    const saleId = saleRes.rows[0].id;
    let total = hasItems ? 0 : saleAmount;
    if (hasItems) {
      for (const it of items) {
        const lineTotal = it.price * it.quantity;
        total += lineTotal;
        await client.query('INSERT INTO sale_items(sale_id,product_id,quantity,price) VALUES($1,$2,$3,$4)', [saleId, it.product_id, it.quantity, it.price]);
        await client.query('UPDATE products SET quantity = quantity - $1 WHERE id=$2', [it.quantity, it.product_id]);
        await client.query('INSERT INTO stock_movements(product_id,type,quantity,date) VALUES($1,$2,$3,NOW())', [it.product_id, 'sale', it.quantity]);
      }
      await client.query('UPDATE sales SET total_amount=$1 WHERE id=$2', [total, saleId]);
    }
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

const getSalesSummary = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         COALESCE(SUM(total_amount), 0)::numeric AS total_sales,
         COUNT(*)::int AS transactions
       FROM sales`
    );
    res.json(result.rows[0] || { total_sales: 0, transactions: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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

const listSalesDetails = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         s.id AS sale_id,
         s.user_id,
         s.total_amount,
         s.date,
         u.name AS cashier_name,
         si.id AS item_id,
         si.quantity,
         si.price,
         p.id AS product_id,
         p.name AS product_name,
         p.expiry_date
       FROM sales s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN products p ON p.id = si.product_id
       ORDER BY s.date DESC, si.id ASC
       LIMIT 300`
    );

    const groupedSales = new Map();
    for (const row of result.rows) {
      if (!groupedSales.has(row.sale_id)) {
        groupedSales.set(row.sale_id, {
          id: row.sale_id,
          user_id: row.user_id,
          cashier_name: row.cashier_name,
          total_amount: row.total_amount,
          date: row.date,
          items: [],
        });
      }

      if (row.item_id) {
        groupedSales.get(row.sale_id).items.push({
          item_id: row.item_id,
          product_id: row.product_id,
          product_name: row.product_name,
          quantity: row.quantity,
          price: row.price,
          line_total: Number(row.price || 0) * Number(row.quantity || 0),
          expiry_date: row.expiry_date,
        });
      }
    }

    res.json(Array.from(groupedSales.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const resetSalesTotal = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const salesResult = await client.query('SELECT id FROM sales');
    const saleIds = salesResult.rows.map((row) => row.id);

    if (saleIds.length) {
      await client.query('DELETE FROM sales WHERE id = ANY($1::int[])', [saleIds]);
    }

    await client.query('COMMIT');
    res.json({ ok: true, removed_sales: saleIds.length, total_sales: 0, transactions: 0 });
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

module.exports = { createSale, getSalesSummary, listSales, listSalesDetails, resetSalesTotal };
