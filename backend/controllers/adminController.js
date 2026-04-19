const db     = require('../config/database');
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ── Helpers ──────────────────────────────────────────────────
async function logAction(adminId, action, req) {
  try {
    await db.execute(
      `INSERT INTO admin_logs (admin_id, event_type, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [adminId, action, JSON.stringify({ path: req.path, method: req.method }), req.ip, req.headers['user-agent']]
    );
  } catch (_) {}
}

// ── Controller ───────────────────────────────────────────────
class AdminController {

  // ── Health ─────────────────────────────────────────────────
  static async healthCheck(req, res) {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  }

  // ── Login ──────────────────────────────────────────────────
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const [rows] = await db.execute('SELECT * FROM admins WHERE email = ? LIMIT 1', [email]);
      const admin  = rows[0];

      if (!admin)           return res.status(401).json({ error: 'Invalid credentials' });
      if (!admin.is_active) return res.status(403).json({ error: 'Account disabled' });

      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        await db.execute('UPDATE admins SET login_attempts = login_attempts + 1 WHERE id = ?', [admin.id]);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      await db.execute('UPDATE admins SET login_attempts = 0, last_login = NOW() WHERE id = ?', [admin.id]);

      const token = jwt.sign(
        { id: admin.id, email: admin.email, user_type: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      await logAction(admin.id, 'ADMIN_LOGIN', req);

      return res.json({
        success: true,
        token,
        user: { id: admin.id, email: admin.email, name: `${admin.first_name} ${admin.last_name}`, user_type: 'admin' },
      });
    } catch (err) {
      console.error('Admin login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // ── Dashboard ──────────────────────────────────────────────
  static async getDashboardStats(req, res) {
    try {
      const [[users]]    = await db.query('SELECT COUNT(*) AS total FROM users');
      const [[sellers]]  = await db.query('SELECT COUNT(*) AS total FROM sellers');
      const [[products]] = await db.query('SELECT COUNT(*) AS total FROM products');
      const [[orders]]   = await db.query('SELECT COUNT(*) AS total, SUM(total_amount) AS revenue FROM orders');

      res.json({
        success: true,
        data: {
          users:    users.total,
          sellers:  sellers.total,
          products: products.total,
          orders:   orders.total,
          revenue:  orders.revenue || 0,
        },
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      res.status(500).json({ error: 'Dashboard error' });
    }
  }

  // ── Users ──────────────────────────────────────────────────
  static async getUsers(req, res) {
    try {
      let { page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const [users]   = await db.query(
        `SELECT id, name, email, phone, user_type, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [Number(limit), offset]
      );
      const [[count]] = await db.query('SELECT COUNT(*) AS total FROM users');

      res.json({
        success: true,
        data: { users, total: count.total, page: Number(page), pages: Math.ceil(count.total / Number(limit)) },
      });
    } catch (err) {
      console.error('getUsers error:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  static async getUserDetails(req, res) {
    try {
      const [[user]] = await db.query(
        'SELECT id, name, email, phone, user_type, created_at FROM users WHERE id = ?',
        [req.params.id]
      );
      if (!user) return res.status(404).json({ error: 'User not found' });

      const [orders] = await db.query(
        'SELECT id, total_amount, status, created_at FROM orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 10',
        [req.params.id]
      );
      res.json({ success: true, data: { user, orders } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'User fetch failed' });
    }
  }

  static async updateUser(req, res) {
    try {
      const { name, email, user_type } = req.body;
      await db.execute(
        'UPDATE users SET name = ?, email = ?, user_type = ? WHERE id = ?',
        [name, email, user_type, req.params.id]
      );
      res.json({ success: true, message: 'User updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Update failed' });
    }
  }

  static async deleteUser(req, res) {
    try {
      await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'User deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Delete failed' });
    }
  }

  // ── Sellers ────────────────────────────────────────────────
  static async getSellers(req, res) {
    try {
      const [rows] = await db.query(
        `SELECT s.*, u.name, u.email
         FROM sellers s
         JOIN users u ON s.user_id = u.id
         ORDER BY s.created_at DESC`
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch sellers' });
    }
  }

  static async verifySeller(req, res) {
    try {
      // sellers table uses boolean `verified` column
      await db.execute(
        'UPDATE sellers SET verified = 1, verified_at = NOW() WHERE id = ?',
        [req.params.id]
      );
      res.json({ success: true, message: 'Seller verified' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Verify failed' });
    }
  }

  static async suspendSeller(req, res) {
    try {
      // Suspend by setting the user's account — sellers table has no status column
      // so we update the linked user's user_type or just flag via verified=false
      await db.execute(
        'UPDATE sellers SET verified = 0 WHERE id = ?',
        [req.params.id]
      );
      res.json({ success: true, message: 'Seller suspended' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Suspend failed' });
    }
  }

  // ── Products ───────────────────────────────────────────────
  static async getProducts(req, res) {
    try {
      const [rows] = await db.query(
        `SELECT p.*, u.name AS seller_name
         FROM products p
         LEFT JOIN users u ON p.seller_id = u.id
         ORDER BY p.created_at DESC`
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  static async approveProduct(req, res) {
    try {
      // products table doesn't have a status column by default —
      // check if the migration added it, otherwise this is a no-op
      await db.execute(
        "UPDATE products SET status = 'approved' WHERE id = ?",
        [req.params.id]
      );
      res.json({ success: true, message: 'Product approved' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Approve failed' });
    }
  }

  static async deleteProductAdmin(req, res) {
    try {
      await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Delete failed' });
    }
  }

  // ── Orders ─────────────────────────────────────────────────
  static async getOrders(req, res) {
    try {
      const [rows] = await db.query(
        `SELECT o.*, u.name AS buyer_name, u.email AS buyer_email
         FROM orders o
         LEFT JOIN users u ON o.buyer_id = u.id
         ORDER BY o.created_at DESC`
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  static async updateOrderStatus(req, res) {
    try {
      // orders table uses `status` column (not order_status)
      await db.execute(
        'UPDATE orders SET status = ? WHERE id = ?',
        [req.body.status, req.params.id]
      );
      res.json({ success: true, message: 'Order updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Update failed' });
    }
  }

  // ── Reviews ────────────────────────────────────────────────
  static async deleteReview(req, res) {
    try {
      await db.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Review deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Delete failed' });
    }
  }

  // ── Disputes — no disputes table, return empty gracefully ──
  static async getDisputes(req, res) {
    res.json({ success: true, data: [], message: 'No disputes table in schema' });
  }
  static async assignDispute(req, res) {
    res.json({ success: true, message: 'Not implemented' });
  }
  static async resolveDispute(req, res) {
    res.json({ success: true, message: 'Not implemented' });
  }

  // ── Security logs — no table, return gracefully ────────────
  static async getSecurityLogs(req, res) {
    res.json({ success: true, data: [], message: 'No security_logs table in schema' });
  }

  // ── Audit trail ────────────────────────────────────────────
  static async getAuditTrail(req, res) {
    try {
      // admin_logs has: id, admin_id, event_type, details, ip_address, user_agent, created_at
      const [rows] = await db.query(
        'SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 100'
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch audit trail' });
    }
  }

  // ── Settings ───────────────────────────────────────────────
  static async getSettings(req, res) {
    try {
      // system_settings columns: id, setting_key, setting_value, description, is_public
      const [rows] = await db.query('SELECT * FROM system_settings');
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  static async updateSetting(req, res) {
    try {
      // column is setting_key and setting_value (not key/value)
      await db.execute(
        'UPDATE system_settings SET setting_value = ? WHERE setting_key = ?',
        [JSON.stringify(req.body.value), req.params.key]
      );
      res.json({ success: true, message: 'Setting updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Update failed' });
    }
  }

  // ── Admin Management ───────────────────────────────────────
  static async getAdmins(req, res) {
    try {
      const [rows] = await db.query(
        'SELECT id, email, first_name, last_name, is_active, is_super_admin, created_at FROM admins'
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch admins' });
    }
  }

  static async createAdmin(req, res) {
    try {
      const { email, password, first_name, last_name } = req.body;
      const hashed = await bcrypt.hash(password, 12);
      await db.execute(
        'INSERT INTO admins (email, password, first_name, last_name) VALUES (?, ?, ?, ?)',
        [email, hashed, first_name || '', last_name || '']
      );
      res.json({ success: true, message: 'Admin created' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Create failed' });
    }
  }

  // ── Escrow ─────────────────────────────────────────────────
  static async releaseEscrow(req, res) {
    try {
      await db.execute(
        "UPDATE escrow_transactions SET status = 'released', released_at = NOW() WHERE order_id = ?",
        [req.params.id]
      );
      res.json({ success: true, message: 'Escrow released' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Release failed' });
    }
  }
}

module.exports = AdminController;
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = crypto.randomBytes(40).toString('hex');

      // Save session
      await db.execute(
        `INSERT INTO admin_sessions 
        (admin_id, session_id, refresh_token, user_agent, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          admin.id,
          crypto.randomBytes(16).toString('hex'),
          refreshToken,
          req.headers['user-agent'],
          req.ip
        ]
      );

      await AdminController.logAction(admin.id, 'ADMIN_LOGIN', req);

      return res.json({
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  }

  static async healthCheck(req, res) {
  res.json({ status: "ok" });
  }

  /**
   * DASHBOARD STATS (MYSQL ONLY)
   */
  static async getDashboardStats(req, res) {
    try {
      const [[users]] = await db.query(
        'SELECT COUNT(*) AS total FROM users'
      );

      const [[sellers]] = await db.query(
        'SELECT COUNT(*) AS total FROM sellers'
      );

      const [[products]] = await db.query(
        'SELECT COUNT(*) AS total FROM products'
      );

      const [[orders]] = await db.query(
        'SELECT COUNT(*) AS total, SUM(total_amount) AS revenue FROM orders'
      );

      const [[disputes]] = await db.query(
        'SELECT COUNT(*) AS total FROM disputes'
      );

      res.json({
        success: true,
        data: {
          users: users.total,
          sellers: sellers.total,
          products: products.total,
          orders: orders.total,
          revenue: orders.revenue || 0,
          disputes: disputes.total
        }
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Dashboard error',
        code: 'DASHBOARD_ERROR'
      });
    }
  }

  /**
   * GET USERS (MYSQL)
   */
  static async getUsers(req, res) {
    try {
      let { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const [users] = await db.query(
        `SELECT id, first_name, last_name, email, role, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [Number(limit), Number(offset)]
      );

      const [[count]] = await db.query(
        'SELECT COUNT(*) AS total FROM users'
      );

      res.json({
        success: true,
        data: {
          users,
          total: count.total,
          page: Number(page),
          pages: Math.ceil(count.total / limit)
        }
      });

    } catch (err) {
      res.status(500).json({
        error: 'Failed to fetch users'
      });
    }
  }

  /**
   * GET SINGLE USER
   */
  static async getUserDetails(req, res) {
    try {
      const { id } = req.params;

      const [[user]] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const [orders] = await db.query(
        'SELECT * FROM orders WHERE buyer_id = ?',
        [id]
      );

      res.json({
        success: true,
        data: {
          user,
          orders
        }
      });

    } catch (err) {
      res.status(500).json({
        error: 'User fetch failed'
      });
    }
  }

  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { first_name, last_name, email, status } = req.body;
    
      await db.execute(
        `UPDATE users SET first_name=?, last_name=?, email=?, status=? WHERE id=?`,
        [first_name, last_name, email, status, id]
      );
    
      res.json({ success: true, message: 'User updated' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
  
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
    
      await db.execute(`DELETE FROM users WHERE id=?`, [id]);
    
      res.json({ success: true, message: 'User deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
  
  static async getSellers(req, res) {
    try {
      const [rows] = await db.query(`SELECT * FROM sellers ORDER BY created_at DESC`);
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch sellers' });
    }
  }
  
  static async verifySeller(req, res) {
    try {
      const { id } = req.params;
    
      await db.execute(
        `UPDATE sellers SET is_verified=1 WHERE id=?`,
        [id]
      );
    
      res.json({ success: true, message: 'Seller verified' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to verify seller' });
    }
  }
  
  static async suspendSeller(req, res) {
    try {
      const { id } = req.params;
    
      await db.execute(
        `UPDATE sellers SET status='suspended' WHERE id=?`,
        [id]
      );
    
      res.json({ success: true, message: 'Seller suspended' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to suspend seller' });
    }
  }
  
  static async getProducts(req, res) {
    try {
      const [rows] = await db.query(`SELECT * FROM products ORDER BY created_at DESC`);
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
  
  static async deleteProductAdmin(req, res) {
    try {
      const { id } = req.params;
    
      await db.execute(`DELETE FROM products WHERE id=?`, [id]);
    
      res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
  
  static async approveProduct(req, res) {
    try {
      const { id } = req.params;
    
      await db.execute(
        `UPDATE products SET status='approved' WHERE id=?`,
        [id]
      );
    
      res.json({ success: true, message: 'Product approved' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to approve product' });
    }
  }
  
  static async getOrders(req, res) {
    try {
      const [rows] = await db.query(`
        SELECT o.*, u.email 
        FROM orders o
        LEFT JOIN users u ON o.buyer_id = u.id
        ORDER BY o.created_at DESC
      `);
    
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
  
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
    
      await db.execute(
        `UPDATE orders SET order_status=? WHERE id=?`,
        [status, id]
      );
    
      res.json({ success: true, message: 'Order updated' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update order' });
    }
  }
  
  static async deleteReview(req, res) {
    try {
      const { id } = req.params;
    
      await db.execute(`DELETE FROM reviews WHERE id=?`, [id]);
    
      res.json({ success: true, message: 'Review deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete review' });
    }
  }
  
  static async getDisputes(req, res) {
    try {
      const [rows] = await db.query(`SELECT * FROM disputes ORDER BY created_at DESC`);
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch disputes' });
    }
  }
  
  static async assignDispute(req, res) {
    try {
      const { id } = req.params;
      const { admin_id } = req.body;
    
      await db.execute(
        `UPDATE disputes SET assigned_admin=? WHERE id=?`,
        [admin_id, id]
      );
    
      res.json({ success: true, message: 'Dispute assigned' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to assign dispute' });
    }
  }
  
  static async resolveDispute(req, res) {
    try {
      const { id } = req.params;
    
      await db.execute(
        `UPDATE disputes SET status='resolved' WHERE id=?`,
        [id]
      );
    
      res.json({ success: true, message: 'Dispute resolved' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to resolve dispute' });
    }
  }
  
  static async getSecurityLogs(req, res) {
    try {
      const [rows] = await db.query(
        `SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 100`
      );
    
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch security logs' });
    }
  }
  
  static async getAuditTrail(req, res) {
    try {
      const [rows] = await db.query(
        `SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 100`
      );
    
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch audit trail' });
    }
  }
  
  static async getSettings(req, res) {
    try {
      const [rows] = await db.query(`SELECT * FROM system_settings`);
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }
  
  static async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;
    
      await db.execute(
        `UPDATE system_settings SET value=? WHERE \`key\`=?`,
        [value, key]
      );
    
      res.json({ success: true, message: 'Setting updated' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update setting' });
    }
  }
  
  static async getAdmins(req, res) {
    try {
      const [rows] = await db.query(`SELECT id, email, role FROM admins`);
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch admins' });
    }
  }
  
  static async createAdmin(req, res) {
    try {
      const { email, password, role } = req.body;
    
      await db.execute(
        `INSERT INTO admins (email, password, role) VALUES (?, ?, ?)`,
        [email, password, role]
      );
    
      res.json({ success: true, message: 'Admin created' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create admin' });
    }
  }
  
  static async releaseEscrow(req, res) {
    try {
      const { id } = req.params;
    
      await db.execute(
        `UPDATE escrow_transactions SET status='released' WHERE order_id=?`,
        [id]
      );
    
      res.json({ success: true, message: 'Escrow released' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to release escrow' });
    }
  }

  /**
   * HELPERS - LOGGING METHODS
   */
  static async logAction(adminId, action, req) {
    try {
      await db.execute(
        `INSERT INTO admin_logs 
        (admin_id, action, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, NOW())`,
        [adminId, action, req.ip, req.headers['user-agent']]
      );
    } catch (err) {
      console.error('Failed to log action:', err);
    }
  }
  
  static async logSecurity(event, req, details) {
    try {
      await db.execute(
        `INSERT INTO security_logs 
        (event_type, ip_address, user_agent, details, severity, created_at)
        VALUES (?, ?, ?, ?, 'medium', NOW())`,
        [
          event,
          req.ip,
          req.headers['user-agent'],
          JSON.stringify(details)
        ]
      );
    } catch (err) {
      console.error('Failed to log security event:', err);
    }
  }
}

module.exports = AdminController;
