const express = require('express');
const router = express.Router();
const { sendVerification, verifyCode, smsConfig } = require('../controllers/smsController');

router.get('/config', smsConfig);
router.post('/send', sendVerification);
router.post('/verify', verifyCode);

module.exports = router;
