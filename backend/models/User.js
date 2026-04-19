const db = require('../config/database');

class User {
  static async create(userData) {
    const { name, email, password, user_type } = userData;
    const phone = userData.phone || null;
    const [result] = await db.execute(
      'INSERT INTO users (name, email, phone, password, user_type) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, password, user_type]
    );
    return result.insertId;
  }

  // Create a user via Google OAuth (no password)
  static async createFromGoogle({ name, email, google_id, avatar, user_type }) {
    const [result] = await db.execute(
      `INSERT INTO users (name, email, phone, password, user_type, google_id, avatar)
       VALUES (?, ?, NULL, NULL, ?, ?, ?)`,
      [name, email, user_type || 'buyer', google_id, avatar || null]
    );
    return result.insertId;
  }

  // Link an existing email account to Google
  static async linkGoogle(id, google_id) {
    await db.execute(
      'UPDATE users SET google_id = ? WHERE id = ?',
      [google_id, id]
    );
  }

  static async findByEmail(email) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async findByGoogleId(google_id) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE google_id = ?',
      [google_id]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, user_type, google_id, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async update(id, userData) {
    const { name, phone } = userData;
    await db.execute(
      'UPDATE users SET name = ?, phone = ? WHERE id = ?',
      [name, phone || null, id]
    );
  }

  static async getAllSellers() {
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, created_at FROM users WHERE user_type = "seller"'
    );
    return rows;
  }
}

module.exports = User;
