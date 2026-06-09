const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createSale, getSalesSummary, listSales, listSalesDetails, resetSalesTotal, getSaleById } = require('../controllers/salesController');

router.post('/', authenticate, createSale);
router.get('/summary', authenticate, getSalesSummary);
router.post('/reset', authenticate, resetSalesTotal);
router.get('/details', authenticate, listSalesDetails);
router.get('/:id', authenticate, getSaleById);
router.get('/', authenticate, listSales);

module.exports = router;
