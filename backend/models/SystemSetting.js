const db = require('../config/database');

class SystemSetting {
  static async create(settingData) {
    const {
      setting_key,
      setting_value,
      description,
      is_public = false
    } = settingData;

    const [result] = await db.execute(
      `INSERT INTO system_settings
       (setting_key, setting_value, description, is_public)
       VALUES (?, ?, ?, ?)`,
      [setting_key, JSON.stringify(setting_value), description, is_public]
    );

    return result.insertId;
  }

  static async getByKey(key) {
    const [rows] = await db.execute(
      'SELECT * FROM system_settings WHERE setting_key = ?',
      [key]
    );

    if (rows[0]) {
      rows[0].setting_value = JSON.parse(rows[0].setting_value);
    }

    return rows[0];
  }

  static async getAll() {
    const [rows] = await db.execute(
      'SELECT * FROM system_settings ORDER BY setting_key'
    );

    return rows.map(row => ({
      ...row,
      setting_value: JSON.parse(row.setting_value)
    }));
  }

  static async getPublicSettings() {
    const [rows] = await db.execute(
      'SELECT * FROM system_settings WHERE is_public = TRUE ORDER BY setting_key'
    );

    return rows.map(row => ({
      ...row,
      setting_value: JSON.parse(row.setting_value)
    }));
  }

  static async update(key, value, description = null) {
    const updateFields = ['setting_value = ?'];
    const params = [JSON.stringify(value)];

    if (description !== null) {
      updateFields.push('description = ?');
      params.push(description);
    }

    params.push(key);

    await db.execute(
      `UPDATE system_settings SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?`,
      params
    );
  }

  static async delete(key) {
    await db.execute(
      'DELETE FROM system_settings WHERE setting_key = ?',
      [key]
    );
  }

  // Initialize default settings
  static async initializeDefaults() {
    const defaults = [
      { key: 'SITE_NAME', value: 'PetHub', description: 'The name of your website', public: true },
      { key: 'SITE_URL', value: 'https://pethub.ng', description: 'The URL of your website', public: true },
      { key: 'COMMISSION_RATE', value: 10, description: 'Percentage commission charged on each order', public: false },
      { key: 'ESCROW_RELEASE_DAYS', value: 7, description: 'Number of days after delivery to auto-release escrow', public: false },
      { key: 'MIN_ORDER_AMOUNT', value: 1000, description: 'Minimum amount required to place an order', public: false },
      { key: 'FREE_SHIPPING_THRESHOLD', value: 5000, description: 'Order amount required for free shipping', public: true },
      { key: 'MAINTENANCE_MODE', value: false, description: 'Enable maintenance mode', public: false }
    ];

    for (const setting of defaults) {
      const existing = await this.getByKey(setting.key);
      if (!existing) {
        await this.create({
          setting_key: setting.key,
          setting_value: setting.value,
          description: setting.description,
          is_public: setting.public
        });
      }
    }
  }
}

module.exports = SystemSetting;