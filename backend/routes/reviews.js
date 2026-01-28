const express = require('express');
const { createReview, getProductReviews, deleteReview } = require('../controllers/reviewController');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

//router.post('/:productId', protect, createReview);
router.get('/:productId', getProductReviews);
//srouter.delete('/:reviewId', protect, deleteReview); // Admin or owner check inside controller

module.exports = router;
