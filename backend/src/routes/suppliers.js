const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { listSuppliers, createSupplier, updateSupplier } = require('../controllers/supplierController');

router.get('/', authenticate, listSuppliers);
router.post('/', authenticate, authorize(['manager', 'owner']), createSupplier);
router.put('/:id', authenticate, authorize(['manager', 'owner']), updateSupplier);

module.exports = router;