const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { register, login, verifyPhone, forgotPassword, resetPassword, getMe, updateMe, verifyMeUpdate, deleteAccount } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-phone', verifyPhone);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.post('/me/verify', authenticate, verifyMeUpdate);
router.delete('/users/:id', authenticate, deleteAccount);

module.exports = router;
