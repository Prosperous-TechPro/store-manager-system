const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { expiryAlerts, missingReport } = require('../controllers/reportsController');

router.get('/expiry', authenticate, expiryAlerts);
router.get('/missing', authenticate, missingReport);

module.exports = router;
