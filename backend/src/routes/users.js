const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { listUsers } = require('../controllers/userController');

router.get('/', authenticate, authorize(['manager', 'owner']), listUsers);
router.delete('/:id', authenticate, authorize(['manager', 'owner', 'admin']), require('../controllers/authController').deleteAccount);

module.exports = router;