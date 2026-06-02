const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createSale, getSalesSummary, listSales, listSalesDetails, resetSalesTotal } = require('../controllers/salesController');

router.post('/', authenticate, authorize(['cashier']), createSale);
router.get('/summary', authenticate, authorize(['cashier', 'manager', 'ceo']), getSalesSummary);
router.post('/reset', authenticate, authorize(['manager']), resetSalesTotal);
router.get('/details', authenticate, authorize(['cashier', 'manager', 'ceo', 'admin']), listSalesDetails);
router.get('/', authenticate, authorize(['cashier', 'manager', 'ceo', 'admin']), listSales);

module.exports = router;
