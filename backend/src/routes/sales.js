const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createSale, listSales } = require('../controllers/salesController');

router.post('/', authenticate, authorize(['casher','manager','saler','owner']), createSale);
router.get('/', authenticate, authorize(['manager','owner']), listSales);

module.exports = router;
