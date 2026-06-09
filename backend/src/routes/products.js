const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { listProducts, getProduct, getProductByBarcode, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');

router.get('/', authenticate, listProducts);
router.get('/barcode/:barcode', authenticate, getProductByBarcode);
router.get('/:id', authenticate, getProduct);
router.post('/', authenticate, createProduct);
router.put('/:id', authenticate, updateProduct);
router.delete('/:id', authenticate, deleteProduct);

module.exports = router;
