const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { expiryAlerts, missingReport } = require('../controllers/reportsController');

router.get('/expiry', authenticate, authorize(['manager','owner']), expiryAlerts);
router.get('/missing', authenticate, authorize(['manager','owner']), missingReport);

module.exports = router;
