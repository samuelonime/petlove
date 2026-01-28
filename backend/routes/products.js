const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const ReviewController = require('../controllers/reviewController');
const { auth, isSeller } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', ProductController.getProducts);
router.get('/seller/my-products', auth, isSeller, ProductController.getSellerProducts);
router.get('/:id', ProductController.getProduct);
router.get('/:id/reviews', ReviewController.getProductReviews);

// Protected routes - Seller only
router.post('/', auth, isSeller, ProductController.createProduct);
router.put('/:id', auth, isSeller, ProductController.updateProduct);
router.delete('/:id', auth, isSeller, ProductController.deleteProduct);

// Reviews
router.post('/:id/reviews', auth, ReviewController.createReview);

module.exports = router;