const db = require('../config/database');

class Order {
  static async create(orderData) {
    const { buyer_id, total_amount, delivery_option, express_shipping } = orderData;
    const [result] = await db.execute(
      `INSERT INTO orders (buyer_id, total_amount, status, delivery_option, express_shipping) 
       VALUES (?, ?, 'pending_payment', ?, ?)`,
      [buyer_id, total_amount, delivery_option, express_shipping || false]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT o.*, u.name as buyer_name, u.email as buyer_email 
       FROM orders o 
       LEFT JOIN users u ON o.buyer_id = u.id 
       WHERE o.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByBuyer(buyerId) {
    const [rows] = await db.execute(
      `SELECT o.*, 
       (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o 
       WHERE buyer_id = ? 
       ORDER BY created_at DESC`,
      [buyerId]
    );
    return rows;
  }

  static async findBySeller(sellerId) {
    const [rows] = await db.execute(
      `SELECT DISTINCT o.* 
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.seller_id = ? 
       ORDER BY o.created_at DESC`,
      [sellerId]
    );
    return rows;
  }

  static async updateStatus(id, status) {
    await db.execute(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
  }

  static async updateShippingInfo(id, shippingData) {
    const { courier_name, tracking_number, estimated_delivery } = shippingData;
    await db.execute(
      `UPDATE orders 
       SET courier_name = ?, tracking_number = ?, estimated_delivery = ?
       WHERE id = ?`,
      [courier_name, tracking_number, estimated_delivery, id]
    );
  }

  static async updateDeliveryProof(id, delivery_proof) {
    await db.execute(
      'UPDATE orders SET delivery_proof = ? WHERE id = ?',
      [delivery_proof, id]
    );
  }

  static async confirmDelivery(id) {
    await db.execute(
      `UPDATE orders 
       SET status = 'delivered', 
           delivered_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );
  }

  static async completeOrder(id) {
    await db.execute(
      `UPDATE orders 
       SET status = 'completed', 
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );
  }

  static async getAll() {
    const [rows] = await db.execute(
      `SELECT o.*, u.name as buyer_name 
       FROM orders o 
       LEFT JOIN users u ON o.buyer_id = u.id 
       ORDER BY o.created_at DESC`
    );
    return rows;
  }

  static async getOrdersForEscrowRelease() {
    const [rows] = await db.execute(
      `SELECT o.* 
       FROM orders o 
       WHERE o.status = 'delivered' 
       AND o.delivered_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
       AND o.payment_released = false`,
      [process.env.ESCROW_AUTO_RELEASE_DAYS || 7]
    );
    return rows;
  }
}

module.exports = Order;