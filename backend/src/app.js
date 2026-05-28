
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const salesRoutes = require('./routes/sales');
const reportsRoutes = require('./routes/reports');
const smsRoutes = require('./routes/sms');

const app = express();

// Configure CORS using `CORS_ORIGIN` env var (comma-separated allowed origins)
const corsOptions = {};
if (process.env.CORS_ORIGIN) {
	corsOptions.origin = process.env.CORS_ORIGIN.split(',').map(s => s.trim());
}
app.use(cors(Object.keys(corsOptions).length ? corsOptions : undefined));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sms', smsRoutes);

app.get('/', (req, res) => res.json({ ok: true, service: 'store-manager-backend' }));

module.exports = app;
