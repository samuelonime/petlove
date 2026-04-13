const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const speakeasy = require('speakeasy');

class Admin {
  static async create(adminData) {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      is_super_admin = false,
      two_factor_enabled = false
    } = adminData;

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `INSERT INTO admins
       (email, password, first_name, last_name, phone, is_super_admin, two_factor_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, first_name, last_name, phone, is_super_admin, two_factor_enabled]
    );

    return result.insertId;
  }

  static async findByEmail(email, includePassword = false) {
    const fields = includePassword
      ? 'id, email, password, first_name, last_name, phone, is_active, is_super_admin, two_factor_secret, two_factor_enabled, password_changed_at, password_reset_token, password_reset_expires, last_login, login_attempts, locked_until, created_at, updated_at'
      : 'id, email, first_name, last_name, phone, is_active, is_super_admin, two_factor_enabled, last_login, created_at, updated_at';

    const [rows] = await db.execute(
      `SELECT ${fields} FROM admins WHERE email = ?`,
      [email]
    );

    return rows[0];
  }

  static async findById(id, includePassword = false) {
    const fields = includePassword
      ? 'id, email, password, first_name, last_name, phone, is_active, is_super_admin, two_factor_secret, two_factor_enabled, password_changed_at, password_reset_token, password_reset_expires, last_login, login_attempts, locked_until, created_at, updated_at'
      : 'id, email, first_name, last_name, phone, is_active, is_super_admin, two_factor_enabled, last_login, created_at, updated_at';

    const [rows] = await db.execute(
      `SELECT ${fields} FROM admins WHERE id = ?`,
      [id]
    );

    return rows[0];
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
      `UPDATE admins SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.execute(
      `UPDATE admins SET password = ?, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [hashedPassword, id]
    );
  }

  static async incrementLoginAttempts(id) {
    await db.execute(
      `UPDATE admins SET login_attempts = login_attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    // Check if account should be locked
    const [rows] = await db.execute(
      'SELECT login_attempts FROM admins WHERE id = ?',
      [id]
    );

    if (rows[0] && rows[0].login_attempts >= 5) {
      await db.execute(
        `UPDATE admins SET locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
    }
  }

  static async resetLoginAttempts(id) {
    await db.execute(
      `UPDATE admins SET login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  static async updateLastLogin(id) {
    await db.execute(
      `UPDATE admins SET last_login = CURRENT_TIMESTAMP, login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  static async createPasswordResetToken(id) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await db.execute(
      `UPDATE admins SET password_reset_token = ?, password_reset_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [hashedToken, id]
    );

    return resetToken;
  }

  static async findByPasswordResetToken(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [rows] = await db.execute(
      'SELECT * FROM admins WHERE password_reset_token = ? AND password_reset_expires > NOW()',
      [hashedToken]
    );

    return rows[0];
  }

  static async clearPasswordResetToken(id) {
    await db.execute(
      `UPDATE admins SET password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  static async getAllAdmins() {
    const [rows] = await db.execute(
      'SELECT id, email, first_name, last_name, phone, is_active, is_super_admin, last_login, created_at FROM admins ORDER BY created_at DESC'
    );

    return rows;
  }

  static async getActiveAdmins() {
    const [rows] = await db.execute(
      'SELECT id, email, first_name, last_name, phone, is_super_admin, last_login FROM admins WHERE is_active = TRUE ORDER BY last_login DESC'
    );

    return rows;
  }

  // Instance methods (for compatibility with existing code)
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static generate2FASecret(email) {
    return speakeasy.generateSecret({
      name: `PetHub Admin (${email})`
    });
  }

  static verify2FAToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1
    });
  }

  static generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}

module.exports = Admin;