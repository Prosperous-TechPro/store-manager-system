const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listSuppliers, createSupplier, updateSupplier } = require('../controllers/supplierController');

router.get('/', authenticate, listSuppliers);
router.post('/', authenticate, createSupplier);
router.put('/:id', authenticate, updateSupplier);

module.exports = router;