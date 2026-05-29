const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createSale, listSales } = require('../controllers/salesController');

router.post('/', authenticate, authorize(['casher','manager','saler','ceo']), createSale);
router.get('/', authenticate, authorize(['manager','ceo']), listSales);

module.exports = router;
