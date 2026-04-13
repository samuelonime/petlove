const db = require('../config/database');

class EscrowTransaction {
  static async create(transactionData) {
    const {
      order_id,
      seller_id,
      amount,
      commission = 0,
      seller_amount,
      status = 'held',
      disputed_at = null,
      dispute_reason = null
    } = transactionData;

    const [result] = await db.execute(
      `INSERT INTO escrow_transactions
       (order_id, seller_id, amount, commission, seller_amount, status, disputed_at, dispute_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_id, seller_id, amount, commission, seller_amount, status, disputed_at, dispute_reason]
    );

    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT et.*, o.buyer_id, s.shop_name, u.name as buyer_name
       FROM escrow_transactions et
       JOIN orders o ON et.order_id = o.id
       JOIN sellers s ON et.seller_id = s.id
       JOIN users u ON o.buyer_id = u.id
       WHERE et.id = ?`,
      [id]
    );

    return rows[0];
  }

  static async findByOrderId(orderId) {
    const [rows] = await db.execute(
      `SELECT et.*, s.shop_name, u.name as buyer_name
       FROM escrow_transactions et
       JOIN sellers s ON et.seller_id = s.id
       JOIN orders o ON et.order_id = o.id
       JOIN users u ON o.buyer_id = u.id
       WHERE et.order_id = ?`,
      [orderId]
    );

    return rows[0];
  }

  static async findBySellerId(sellerId, status = null) {
    let sql = `SELECT et.*, o.id as order_id, o.total_amount, u.name as buyer_name
               FROM escrow_transactions et
               JOIN orders o ON et.order_id = o.id
               JOIN users u ON o.buyer_id = u.id
               WHERE et.seller_id = ?`;
    const params = [sellerId];

    if (status) {
      sql += ' AND et.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY et.created_at DESC';

    const [rows] = await db.execute(sql, params);
    return rows;
  }

  static async updateStatus(id, status, additionalData = {}) {
    const fields = ['status = ?'];
    const values = [status];

    if (status === 'released') {
      fields.push('released_at = CURRENT_TIMESTAMP');
    } else if (status === 'disputed') {
      fields.push('disputed_at = CURRENT_TIMESTAMP');
      if (additionalData.dispute_reason) {
        fields.push('dispute_reason = ?');
        values.push(additionalData.dispute_reason);
      }
    } else if (status === 'resolved') {
      fields.push('resolved_at = CURRENT_TIMESTAMP');
    }

    values.push(id);

    await db.execute(
      `UPDATE escrow_transactions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
  }

  static async getEscrowStats() {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount_held,
        SUM(CASE WHEN status = 'held' THEN amount ELSE 0 END) as amount_held,
        SUM(CASE WHEN status = 'released' THEN seller_amount ELSE 0 END) as amount_released,
        SUM(CASE WHEN status = 'disputed' THEN amount ELSE 0 END) as amount_disputed,
        SUM(commission) as total_commission
      FROM escrow_transactions
    `);

    return rows[0];
  }

  static async getPendingReleases() {
    const [rows] = await db.execute(`
      SELECT et.*, o.id as order_id, o.status as order_status, o.delivered_at,
             s.shop_name, u.name as buyer_name, u.email as buyer_email
      FROM escrow_transactions et
      JOIN orders o ON et.order_id = o.id
      JOIN sellers s ON et.seller_id = s.id
      JOIN users u ON o.buyer_id = u.id
      WHERE et.status = 'held'
      AND o.status = 'delivered'
      AND o.delivered_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY o.delivered_at ASC
    `);

    return rows;
  }

  static async releaseFunds(orderId) {
    await db.execute(
      `UPDATE escrow_transactions SET status = 'released', released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
      [orderId]
    );
  }

  static async getMonthlyStats(year, month) {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) as transactions_count,
        SUM(amount) as total_amount,
        SUM(commission) as total_commission,
        SUM(seller_amount) as total_released
      FROM escrow_transactions
      WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
    `, [year, month]);

    return rows[0];
  }
}

module.exports = EscrowTransaction;
