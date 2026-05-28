const express = require('express');
const router = express.Router();
const { sendVerification, verifyCode } = require('../controllers/smsController');

router.post('/send', sendVerification);
router.post('/verify', verifyCode);

module.exports = router;
