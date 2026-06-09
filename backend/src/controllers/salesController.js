const db = require('../models/db');
const { broadcast } = require('../services/realtime');

const createSale = async (req, res) => {
  const { items, amount, total_amount, customer_name } = req.body;
  const saleAmount = Number.parseFloat(amount ?? total_amount);
  const hasItems = Array.isArray(items) && items.length > 0;
  if (!hasItems && !Number.isFinite(saleAmount)) return res.status(400).json({ error: 'Sale amount is required' });
  if (Number.isFinite(saleAmount) && saleAmount < 0) return res.status(400).json({ error: 'Sale amount must be at least 0' });

  const normalizedItems = hasItems
    ? items
        .map((item) => ({
          product_id: Number.parseInt(item.product_id, 10),
          quantity: Number.parseInt(item.quantity, 10),
          price: Number.parseFloat(item.price ?? item.unit_price),
        }))
        .filter((item) => Number.isFinite(item.product_id) && Number.isFinite(item.quantity) && item.quantity > 0)
    : [];

  if (hasItems && !normalizedItems.length) {
    return res.status(400).json({ error: 'Add at least one valid product' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cashierResult = await client.query('SELECT id, name FROM users WHERE id=$1', [req.user.id]);
    const cashierName = cashierResult.rows[0]?.name || 'Cashier';
    
    // Requirement 1: Unique receipt (ID) and customer name
    // Requirement 11: Cashier name linked via user_id
    const saleRes = await client.query('INSERT INTO sales(user_id,total_amount,customer_name,date) VALUES($1,$2,$3,NOW()) RETURNING id,date', 
      [req.user.id, hasItems ? 0 : saleAmount, customer_name || 'Valued Customer']);
    
    const saleId = saleRes.rows[0].id;
    let total = hasItems ? 0 : saleAmount;
    const receiptItems = [];
    if (hasItems) {
      for (const it of normalizedItems) {
        const productResult = await client.query('SELECT id, name, quantity, selling_price, cost_price FROM products WHERE id=$1 FOR UPDATE', [it.product_id]);
        const product = productResult.rows[0];
        if (!product) {
          throw new Error(`Product ${it.product_id} not found`);
        }

        if (Number.parseInt(product.quantity || 0, 10) < it.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const unitPrice = Number.isFinite(it.price) ? it.price : Number.parseFloat(product.selling_price || 0);
        const costPrice = Number.parseFloat(product.cost_price || 0);
        const lineTotal = unitPrice * it.quantity;
        total += lineTotal;
        // Store cost_price at time of sale for accurate profit reporting (Requirement 12)
        await client.query('INSERT INTO sale_items(sale_id,product_id,quantity,price,cost_price) VALUES($1,$2,$3,$4,$5)', [saleId, it.product_id, it.quantity, unitPrice, costPrice]);
        await client.query('UPDATE products SET quantity = quantity - $1 WHERE id=$2', [it.quantity, it.product_id]);
        await client.query('INSERT INTO stock_movements(product_id,type,quantity,date) VALUES($1,$2,$3,NOW())', [it.product_id, 'sale', it.quantity]);
        receiptItems.push({
          product_id: product.id,
          product_name: product.name,
          quantity: it.quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        });
      }
      await client.query('UPDATE sales SET total_amount=$1 WHERE id=$2', [total, saleId]);
    }
    await client.query('COMMIT');
    const payload = {
      saleId,
      total,
      customer_name: customer_name || 'Valued Customer',
      cashier_name: cashierName,
      items: hasItems ? receiptItems : [],
      date: saleRes.rows[0].date,
    };
    broadcast('sales', { action: 'created', sale: payload });
    broadcast('inventory', { action: 'updated' });
    res.status(201).json(payload);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  } finally {
    if (typeof client.release === 'function') {
      client.release();
    }
  }
};

const getSalesSummary = async (req, res) => {
  try {
    // Requirement 1 & 12: CEO/Manager can view Revenue, Cost, and Profit
    const basics = await db.query(
      `SELECT
         COALESCE(SUM(total_amount), 0)::numeric AS total_sales,
         COUNT(*)::int AS transactions
       FROM sales`
    );

    const costs = await db.query(
      `SELECT
         COALESCE(SUM(si.quantity * si.cost_price), 0)::numeric AS total_cost
       FROM sale_items si`
    );

    const totalSales = Number.parseFloat(basics.rows[0].total_sales);
    const totalCost = Number.parseFloat(costs.rows[0].total_cost);

    // Requirement 12 Detail Drill-down using stored cost_price
    const details = await db.query(
      `SELECT
         s.id AS sale_id,
         s.total_amount AS revenue,
         COALESCE(SUM(si.quantity * si.cost_price), 0)::numeric AS cost,
         (s.total_amount - COALESCE(SUM(si.quantity * si.cost_price), 0))::numeric AS profit
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       GROUP BY s.id, s.total_amount, s.date
       ORDER BY s.date DESC
       LIMIT 50`
    );

    res.json({
      total_sales: totalSales,
      transactions: basics.rows[0].transactions,
      total_cost: totalCost,
      total_profit: totalSales - totalCost,
      details: details.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Requirement 10: Search receipt by number
const getSaleById = async (req, res) => {
  const { id } = req.params;
  try {
    const saleResult = await db.query(
      `SELECT s.*, u.name as cashier_name 
       FROM sales s 
       LEFT JOIN users u ON u.id = s.user_id 
       WHERE s.id = $1`, [id]
    );
    if (saleResult.rows.length === 0) return res.status(404).json({ error: 'Receipt not found' });

    const itemsResult = await db.query(
      `SELECT si.*, p.name as product_name 
       FROM sale_items si 
       JOIN products p ON p.id = si.product_id 
       WHERE si.sale_id = $1`, [id]
    );

    const sale = saleResult.rows[0];
    res.json({
      saleId: sale.id,
      total: Number.parseFloat(sale.total_amount),
      date: sale.date,
      customer_name: sale.customer_name,
      cashier_name: sale.cashier_name,
      items: itemsResult.rows.map(item => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: Number.parseFloat(item.price),
        line_total: Number.parseFloat(item.price) * item.quantity
      }))
    });
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
         s.customer_name,
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
          customer_name: row.customer_name,
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

module.exports = { createSale, getSalesSummary, listSales, listSalesDetails, resetSalesTotal, getSaleById };
