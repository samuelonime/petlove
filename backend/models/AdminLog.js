const db = require('../config/database');

class AdminLog {
  static async create(logData) {
    const {
      admin_id,
      event_type,
      details,
      ip_address,
      user_agent
    } = logData;

    const [result] = await db.execute(
      `INSERT INTO admin_logs
       (admin_id, event_type, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [admin_id, event_type, JSON.stringify(details), ip_address, user_agent]
    );

    return result.insertId;
  }

  static async findByAdminId(adminId, limit = 50) {
    const [rows] = await db.execute(
      `SELECT al.*, a.first_name, a.last_name, a.email
       FROM admin_logs al
       LEFT JOIN admins a ON al.admin_id = a.id
       WHERE al.admin_id = ?
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [adminId, limit]
    );

    return rows;
  }

  static async getRecentLogs(limit = 100) {
    const [rows] = await db.execute(
      `SELECT al.*, a.first_name, a.last_name, a.email
       FROM admin_logs al
       LEFT JOIN admins a ON al.admin_id = a.id
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [limit]
    );

    return rows;
  }

  static async getLogsByEventType(eventType, limit = 50) {
    const [rows] = await db.execute(
      `SELECT al.*, a.first_name, a.last_name, a.email
       FROM admin_logs al
       LEFT JOIN admins a ON al.admin_id = a.id
       WHERE al.event_type = ?
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [eventType, limit]
    );

    return rows;
  }

  static async getStats(hours = 24) {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) as total_logs,
        COUNT(DISTINCT admin_id) as unique_admins,
        event_type,
        COUNT(*) as event_count
      FROM admin_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      GROUP BY event_type
      ORDER BY event_count DESC
    `, [hours]);

    return rows;
  }

  static async cleanupOldLogs(days = 90) {
    await db.execute(
      'DELETE FROM admin_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
  }
}

module.exports = AdminLog;