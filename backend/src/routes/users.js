const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { listUsers, approveUser } = require('../controllers/userController');

router.get('/', authenticate, authorize(['manager', 'ceo']), listUsers);
router.post('/:id/approve', authenticate, authorize(['manager', 'ceo']), approveUser);
router.delete('/:id', authenticate, authorize(['manager', 'ceo', 'admin']), require('../controllers/authController').deleteAccount);

module.exports = router;