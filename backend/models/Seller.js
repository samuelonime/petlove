const db = require('../config/database');

class Seller {
  static async create(sellerData) {
    const {
      user_id,
      shop_name,
      shop_description,
      shop_logo,
      verified = false,
      verification_level = 'none',
      account_name,
      account_number,
      bank_code,
      business_address,
      business_phone,
      tax_id
    } = sellerData;

    const [result] = await db.execute(
      `INSERT INTO sellers
       (user_id, shop_name, shop_description, shop_logo, verified, verification_level, account_name, account_number, bank_code, business_address, business_phone, tax_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, shop_name, shop_description, shop_logo, verified, verification_level, account_name, account_number, bank_code, business_address, business_phone, tax_id]
    );

    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT s.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM sellers s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [id]
    );

    return rows[0];
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT s.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM sellers s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [userId]
    );

    return rows[0];
  }

  static async findAll(query = {}) {
    let sql = `SELECT s.*, u.name as user_name, u.email as user_email, u.phone as user_phone
               FROM sellers s
               JOIN users u ON s.user_id = u.id`;
    const params = [];
    const conditions = [];

    if (query.verified !== undefined) {
      conditions.push('s.verified = ?');
      params.push(query.verified);
    }

    if (query.verification_level) {
      conditions.push('s.verification_level = ?');
      params.push(query.verification_level);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY s.created_at DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    const [rows] = await db.execute(sql, params);
    return rows;
  }

  static async count(query = {}) {
    let sql = 'SELECT COUNT(*) as count FROM sellers s';
    const params = [];
    const conditions = [];

    if (query.verified !== undefined) {
      conditions.push('s.verified = ?');
      params.push(query.verified);
    }

    if (query.verification_level) {
      conditions.push('s.verification_level = ?');
      params.push(query.verification_level);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await db.execute(sql, params);
    return rows[0].count;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) return;

    values.push(id);

    await db.execute(
      `UPDATE sellers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
  }

  static async updateRating(sellerId) {
    // Update seller rating based on product reviews
    await db.execute(`
      UPDATE sellers s
      SET rating = (
        SELECT COALESCE(AVG(r.rating), 0)
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE p.seller_id = s.user_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM reviews r
        JOIN products p ON r.product_id = p.id
        WHERE p.seller_id = s.user_id
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE s.id = ?
    `, [sellerId]);
  }

  static async getSellerStats() {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) as total_sellers,
        SUM(CASE WHEN verified = TRUE THEN 1 ELSE 0 END) as verified_sellers,
        SUM(CASE WHEN verified = FALSE THEN 1 ELSE 0 END) as unverified_sellers,
        AVG(rating) as avg_rating
      FROM sellers
    `);

    return rows[0];
  }

  static async getTopRatedSellers(limit = 10) {
    const [rows] = await db.execute(`
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM sellers s
      JOIN users u ON s.user_id = u.id
      WHERE s.verified = TRUE AND s.rating > 0
      ORDER BY s.rating DESC, s.total_reviews DESC
      LIMIT ?
    `, [limit]);

    return rows;
  }
}

module.exports = Seller;
