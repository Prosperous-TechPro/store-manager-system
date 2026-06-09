const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listUsers, listPendingUsers, approveUser } = require('../controllers/userController');

router.get('/', authenticate, listUsers);
router.get('/pending', authenticate, listPendingUsers);
router.post('/:id/approve', authenticate, approveUser);
router.delete('/:id', authenticate, require('../controllers/authController').deleteAccount);

module.exports = router;