const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { expiryAlerts, missingReport } = require('../controllers/reportsController');

router.get('/expiry', authenticate, authorize(['manager','ceo']), expiryAlerts);
router.get('/missing', authenticate, authorize(['manager','ceo']), missingReport);

module.exports = router;
