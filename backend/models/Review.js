const db = require('../config/database');

class Review {
  static async create(reviewData) {
    const { user_id, product_id, rating, comment } = reviewData;
    const [result] = await db.execute(
      `INSERT INTO reviews (user_id, product_id, rating, comment) 
       VALUES (?, ?, ?, ?)`,
      [user_id, product_id, rating, comment]
    );
    return result.insertId;
  }

  static async findByProduct(productId) {
    const [rows] = await db.execute(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = ? 
       ORDER BY r.created_at DESC`,
      [productId]
    );
    return rows;
  }

  static async getProductRating(productId) {
    const [rows] = await db.execute(
      `SELECT AVG(rating) as average_rating, COUNT(*) as review_count 
       FROM reviews 
       WHERE product_id = ?`,
      [productId]
    );
    return rows[0];
  }
}

module.exports = Review;