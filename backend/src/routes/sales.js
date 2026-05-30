const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createSale, getSalesSummary, listSales, listSalesDetails } = require('../controllers/salesController');

router.post('/', authenticate, authorize(['casher']), createSale);
router.get('/summary', authenticate, authorize(['casher']), getSalesSummary);
router.get('/details', authenticate, authorize(['casher']), listSalesDetails);
router.get('/', authenticate, authorize(['casher']), listSales);

module.exports = router;
