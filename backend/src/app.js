
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const supplierRoutes = require('./routes/suppliers');
const salesRoutes = require('./routes/sales');
const reportsRoutes = require('./routes/reports');
const smsRoutes = require('./routes/sms');

const app = express();

// Configure CORS using `CORS_ORIGIN` env var (comma-separated allowed origins).
// If no env var is set, echo the browser origin so Vercel/preview hosts still work.
const corsOptions = {
	origin: process.env.CORS_ORIGIN
		? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
		: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sms', smsRoutes);

app.get('/', (req, res) => res.json({ ok: true, service: 'store-manager-backend' }));

module.exports = app;
