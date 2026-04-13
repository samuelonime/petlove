const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const db = require('../config/database');

// @desc    Create a new review for a product
// @route   POST /api/reviews/:productId
// @access  Private (user must be logged in)
const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.productId;
    const userId = req.user.id; // Assuming auth middleware sets req.user

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Check if user already reviewed this product
    const [existingReview] = await db.execute(
      'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
      [productId, userId]
    );
    if (existingReview.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Create review
    const reviewId = await Review.create({
      user_id: userId,
      product_id: productId,
      rating,
      comment,
    });

    res.status(201).json({ success: true, data: { id: reviewId, rating, comment } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all reviews for a product
// @route   GET /api/reviews/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const productId = req.params.productId;
    const reviews = await Review.findByProduct(productId);
    res.status(200).json({ success: true, data: reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a review (Admin or owner)
// @route   DELETE /api/reviews/:reviewId
// @access  Private/Admin
const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const review = await Review.findById(reviewId);

    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Optional: check if user is owner or admin
    if (req.user.role !== 'admin' && review.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await review.remove();
    res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  deleteReview,
};
