const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { listUsers } = require('../controllers/userController');

router.get('/', authenticate, authorize(['manager', 'ceo']), listUsers);
router.delete('/:id', authenticate, authorize(['manager', 'ceo', 'admin']), require('../controllers/authController').deleteAccount);

module.exports = router;