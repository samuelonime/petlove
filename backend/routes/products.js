const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const ReviewController = require('../controllers/reviewController');
const { auth, isSeller } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Specific named routes FIRST (before any /:id wildcard) ──

// Seller's own products
router.get('/seller/my-products', auth, isSeller, ProductController.getSellerProducts);

// Public product listing
router.get('/', ProductController.getProducts);

// Protected — seller create
router.post('/', auth, isSeller, ProductController.createProduct);

// ── Wildcard /:id routes LAST ────────────────────────────────

router.get('/:id', ProductController.getProduct);
router.get('/:id/reviews', ReviewController.getProductReviews);
router.put('/:id', auth, isSeller, ProductController.updateProduct);
router.delete('/:id', auth, isSeller, ProductController.deleteProduct);
router.post('/:id/reviews', auth, ReviewController.createReview);

module.exports = router;
