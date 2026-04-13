const db = require('../config/database');
const crypto = require('crypto');

class AdminSession {
  static async create(sessionData) {
    const {
      admin_id,
      session_token,
      ip_address,
      user_agent,
      expires_at
    } = sessionData;

    const [result] = await db.execute(
      `INSERT INTO admin_sessions
       (admin_id, session_token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [admin_id, session_token, ip_address, user_agent, expires_at]
    );

    return result.insertId;
  }

  static async findByToken(token) {
    const [rows] = await db.execute(
      `SELECT as.*, a.email, a.first_name, a.last_name
       FROM admin_sessions as
       JOIN admins a ON as.admin_id = a.id
       WHERE as.session_token = ?
       AND as.expires_at > NOW()
       AND a.is_active = TRUE`,
      [token]
    );

    return rows[0];
  }

  static async findByAdminId(adminId) {
    const [rows] = await db.execute(
      'SELECT * FROM admin_sessions WHERE admin_id = ? AND expires_at > NOW() ORDER BY created_at DESC',
      [adminId]
    );

    return rows;
  }

  static async updateLastActivity(sessionId) {
    await db.execute(
      'UPDATE admin_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sessionId]
    );
  }

  static async revokeSession(sessionId) {
    await db.execute(
      'UPDATE admin_sessions SET expires_at = NOW() WHERE id = ?',
      [sessionId]
    );
  }

  static async revokeAllSessions(adminId) {
    await db.execute(
      'UPDATE admin_sessions SET expires_at = NOW() WHERE admin_id = ? AND expires_at > NOW()',
      [adminId]
    );
  }

  static async cleanupExpiredSessions() {
    await db.execute('DELETE FROM admin_sessions WHERE expires_at <= NOW()');
  }

  static async getActiveSessionCount(adminId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM admin_sessions WHERE admin_id = ? AND expires_at > NOW()',
      [adminId]
    );

    return rows[0].count;
  }

  static generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = AdminSession;