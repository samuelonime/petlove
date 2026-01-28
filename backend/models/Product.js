const db = require('../config/database');

class Product {
  static async create(productData) {
    const { seller_id, name, description, category, price, stock, images } = productData;
    const [result] = await db.execute(
      `INSERT INTO products (seller_id, name, description, category, price, stock, images) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [seller_id, name, description, category, price, stock, JSON.stringify(images)]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT p.*, u.name as seller_name 
       FROM products p 
       LEFT JOIN users u ON p.seller_id = u.id 
       WHERE p.id = ?`,
      [id]
    );
    if (rows[0]) {
      rows[0].images = JSON.parse(rows[0].images || '[]');
    }
    return rows[0];
  }

  static async findBySeller(sellerId) {
    const [rows] = await db.execute(
      'SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC',
      [sellerId]
    );
    return rows.map(row => ({
      ...row,
      images: JSON.parse(row.images || '[]')
    }));
  }

  static async update(id, productData) {
    const { name, description, category, price, stock, images } = productData;
    await db.execute(
      `UPDATE products 
       SET name = ?, description = ?, category = ?, price = ?, stock = ?, images = ?
       WHERE id = ?`,
      [name, description, category, price, stock, JSON.stringify(images), id]
    );
  }

  static async delete(id) {
    await db.execute('DELETE FROM products WHERE id = ?', [id]);
  }

  static async getAll(filters = {}) {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.minPrice) {
      query += ' AND price >= ?';
      params.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      query += ' AND price <= ?';
      params.push(filters.maxPrice);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows.map(row => ({
      ...row,
      images: JSON.parse(row.images || '[]')
    }));
  }

  static async updateStock(id, quantity) {
    await db.execute(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [quantity, id]
    );
  }
}

module.exports = Product;