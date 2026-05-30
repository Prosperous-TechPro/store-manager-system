const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createSale, getSalesSummary, listSales, listSalesDetails, resetSalesTotal } = require('../controllers/salesController');

router.post('/', authenticate, authorize(['casher']), createSale);
router.get('/summary', authenticate, authorize(['casher', 'manager', 'ceo']), getSalesSummary);
router.post('/reset', authenticate, authorize(['manager']), resetSalesTotal);
router.get('/details', authenticate, authorize(['casher', 'manager', 'ceo', 'admin']), listSalesDetails);
router.get('/', authenticate, authorize(['casher', 'manager', 'ceo', 'admin']), listSales);

module.exports = router;
