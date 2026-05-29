const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { listUsers, listPendingUsers, approveUser } = require('../controllers/userController');

router.get('/', authenticate, authorize(['manager', 'ceo']), listUsers);
router.get('/pending', authenticate, authorize(['manager', 'ceo']), listPendingUsers);
router.post('/:id/approve', authenticate, authorize(['manager', 'ceo']), approveUser);
router.delete('/:id', authenticate, authorize(['manager', 'ceo', 'admin']), require('../controllers/authController').deleteAccount);

module.exports = router;