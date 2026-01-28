const db = require('../config/database');

class OrderItem {
  static async createBatch(items) {
    for (const item of items) {
      await db.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [item.order_id, item.product_id, item.quantity, item.price]
      );
    }
  }

  static async findByOrder(orderId) {
    const [rows] = await db.execute(
      `SELECT oi.*, p.name as product_name, p.images, p.seller_id
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    return rows.map(row => ({
      ...row,
      images: JSON.parse(row.images || '[]')
    }));
  }
}

module.exports = OrderItem;