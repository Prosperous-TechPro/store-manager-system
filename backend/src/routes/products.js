const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { listProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');

router.get('/', authenticate, listProducts);
router.get('/:id', authenticate, getProduct);
router.post('/', authenticate, authorize(['manager','ceo']), createProduct);
router.put('/:id', authenticate, authorize(['manager','ceo']), updateProduct);
router.delete('/:id', authenticate, authorize(['manager','ceo']), deleteProduct);

module.exports = router;
