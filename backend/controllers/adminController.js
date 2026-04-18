const Admin = require('../models/Admin');           // Keep if it's now SQL-based or a plain class
const AdminSession = require('../models/AdminSession');
const AdminLog = require('../models/AdminLog');
// const User = require('../models/User');          // Removed Mongoose models
// const Seller = require('../models/Seller');
// ... (remove other Mongoose requires)

const db = require('../config/database');

// Utility imports (unchanged)
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Removed: const mongoose = require('mongoose');

class AdminController {
  /**
   * Admin Authentication
   */
  static async login(req, res) {
    try {
      const { email, password, twoFactorToken } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password', code: 'MISSING_CREDENTIALS' });
      }

      // Get admin with password (assume Admin model has static findByEmail that uses SQL now)
      const admin = await Admin.findByEmail(email);

      if (!admin || !admin.isActive) {
        // SecurityLog.create → convert to SQL insert
        await db.execute(`
          INSERT INTO security_logs (event_type, ip_address, user_agent, details, severity, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, ['admin_login_failed', req.ip, req.headers['user-agent'], JSON.stringify({ email, reason: 'Invalid credentials or inactive account' }), 'medium']);

        return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
      }

      if (admin.isLocked) {
        const lockTime = Math.ceil((new Date(admin.lockUntil) - Date.now()) / 60000);
        await db.execute(`INSERT INTO security_logs ...` /* similar as above */);
        return res.status(403).json({ error: `Account is locked. Try again in ${lockTime} minutes.`, code: 'ACCOUNT_LOCKED' });
      }

      const isPasswordValid = await admin.comparePassword(password);

      if (!isPasswordValid) {
        await admin.incrementLoginAttempts();   // Assume this method is updated to SQL
        await db.execute(`INSERT INTO security_logs ...` /* invalid password */);
        return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
      }

      // 2FA logic remains similar (assume methods on Admin instance work)
      if (admin.twoFactorEnabled) {
        if (!twoFactorToken) {
          return res.status(400).json({ error: 'Two-factor authentication token required', code: '2FA_TOKEN_REQUIRED', requires2FA: true });
        }

        const is2FAValid = admin.verify2FAToken(twoFactorToken);
        if (!is2FAValid) {
          const isBackupCode = admin.verifyBackupCode(twoFactorToken);
          if (!isBackupCode) {
            await db.execute(`INSERT INTO security_logs ...` /* 2fa failed */);
            return res.status(401).json({ error: 'Invalid two-factor authentication token', code: 'INVALID_2FA_TOKEN' });
          }
        }
      }

      await admin.resetLoginAttempts();
      admin.lastLogin = new Date();
      admin.loginCount += 1;
      await admin.save();   // Assume Admin model save() now does SQL UPDATE

      // Generate tokens (unchanged)
      const accessToken = jwt.sign(
        { id: admin.id, role: admin.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '15m' }
      );

      const refreshToken = crypto.randomBytes(40).toString('hex');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // Create session (assume AdminSession.createSession uses SQL)
      const session = await AdminSession.createSession(admin.id, {
        sessionId: crypto.randomBytes(16).toString('hex'),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        tokenHash: crypto.createHash('sha256').update(accessToken).digest('hex'),
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // AdminLog.logAction (assume updated to SQL)
      await AdminLog.logAction({
        adminId: admin.id,
        action: 'ADMIN_LOGIN',
        entityType: 'admin',
        entityId: admin.id,
        details: { email: admin.email, role: admin.role, sessionId: session.sessionId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            permissions: admin.permissions,
            twoFactorEnabled: admin.twoFactorEnabled,
            preferences: admin.preferences
          },
          tokens: { accessToken, refreshToken, expiresIn: 15 * 60 },
          session: { id: session.sessionId, expiresAt: session.expiresAt }
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      await db.execute(`INSERT INTO security_logs ...` /* login error */);
      res.status(500).json({ error: 'Login failed. Please try again.', code: 'LOGIN_FAILED' });
    }
  }

  /**
   * Get Admin Dashboard Statistics
   */
  static async getDashboardStats(req, res) {
    try {
      await AdminLog.logAction({ /* ... same as before, but using SQL under the hood */ });

      // Replace all aggregates with SQL queries
      const [userStats] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN created_at >= NOW() - INTERVAL 1 DAY THEN 1 ELSE 0 END) AS today,
          JSON_OBJECTAGG(account_status, status_count) AS byStatus
        FROM (
          SELECT account_status, COUNT(*) AS status_count 
          FROM users 
          GROUP BY account_status
        ) sub
      `);

      const [sellerStats] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verified,
          SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) AS pendingVerification
        FROM sellers
      `);

      const [productStats] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
          JSON_OBJECTAGG(category, cat_count) AS byCategory
        FROM (
          SELECT category, COUNT(*) AS cat_count FROM products GROUP BY category
        ) sub
      `);

      const [orderStats] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN created_at >= NOW() - INTERVAL 1 DAY THEN 1 ELSE 0 END) AS today,
          JSON_OBJECTAGG(order_status, status_count) AS byStatus,
          SUM(CASE WHEN payment_status = 'completed' THEN total_amount ELSE 0 END) AS revenue
        FROM orders
      `);

      const [financialStats] = await db.query(`
        SELECT 
          SUM(CASE WHEN transaction_type = 'hold' THEN amount ELSE 0 END) AS totalHeld,
          SUM(CASE WHEN transaction_type = 'release' THEN amount ELSE 0 END) AS totalReleased,
          SUM(commission_amount) AS commission
        FROM escrow_transactions
      `);

      const [disputeStats] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN dispute_status = 'open' THEN 1 ELSE 0 END) AS open,
          JSON_OBJECTAGG(dispute_type, type_count) AS byType
        FROM disputes
      `);

      const [securityStats] = await db.query(`
        SELECT 
          SUM(CASE WHEN created_at >= NOW() - INTERVAL 1 DAY THEN 1 ELSE 0 END) AS today,
          JSON_OBJECTAGG(severity, sev_count) AS bySeverity,
          SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) AS suspicious
        FROM security_logs
      `);

      // Recent activity with JOINs
      const [recentOrders] = await db.query(`
        SELECT o.*, u.email, u.first_name, u.last_name 
        FROM orders o 
        LEFT JOIN users u ON o.buyer_id = u.id 
        ORDER BY o.created_at DESC LIMIT 10
      `);

      const [recentUsers] = await db.query(`
        SELECT id, email, first_name, last_name, account_status, created_at 
        FROM users ORDER BY created_at DESC LIMIT 10
      `);

      const [recentSecurityLogs] = await db.query(`
        SELECT sl.*, u.email 
        FROM security_logs sl 
        LEFT JOIN users u ON sl.user_id = u.id 
        ORDER BY sl.created_at DESC LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers: userStats[0]?.total || 0,
            totalSellers: sellerStats[0]?.total || 0,
            totalProducts: productStats[0]?.total || 0,
            totalOrders: orderStats[0]?.total || 0,
            totalRevenue: orderStats[0]?.revenue || 0,
            totalDisputes: disputeStats[0]?.total || 0
          },
          statistics: { /* map the fields similarly, adjust JSON parsing if needed */ },
          recentActivity: {
            orders: recentOrders,
            users: recentUsers,
            securityLogs: recentSecurityLogs
          }
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to load dashboard statistics', code: 'DASHBOARD_ERROR' });
    }
  }

  // === USER MANAGEMENT (already partially SQL) ===
  static async getUsers(req, res) {
    try {
      let { page = 1, limit = 20, search = "", role, status, sortBy = "created_at", sortOrder = "DESC" } = req.query;
      const offset = (page - 1) * limit;

      let sql = `SELECT id, first_name, last_name, email, phone, role, status, created_at FROM users WHERE 1=1`;
      const params = [];

      if (search) {
        sql += ` AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (role) { sql += ` AND role = ?`; params.push(role); }
      if (status) { sql += ` AND status = ?`; params.push(status); }

      sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const [users] = await db.query(sql, params);
      const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users`);

      // Statistics (SQL version of aggregate)
      const [stats] = await db.query(`
        SELECT account_status AS _id, COUNT(*) AS count 
        FROM users GROUP BY account_status
      `);

      await AdminLog.logAction({ /* ... */ });

      res.json({
        success: true,
        data: {
          users,
          pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
          statistics: stats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {})
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users', code: 'USERS_FETCH_ERROR' });
    }
  }

  static async getUserDetails(req, res) {
    try {
      const { id } = req.params;

      const [[user]] = await db.query(`
        SELECT * FROM users WHERE id = ? LIMIT 1
      `, [id]);

      if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

      const [orders] = await db.query(`SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 10`, [id]);
      const [reviews] = await db.query(`
        SELECT r.*, p.name AS product_name 
        FROM reviews r LEFT JOIN products p ON r.product_id = p.id 
        WHERE r.user_id = ? LIMIT 10
      `, [id]);
      const [securityLogs] = await db.query(`SELECT * FROM security_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`, [id]);

      await AdminLog.logAction({ /* ... */ });

      res.json({
        success: true,
        data: {
          user,
          statistics: {
            totalOrders: orders.length,
            totalReviews: reviews.length,
            totalSpent: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
          },
          recentOrders: orders,
          recentReviews: reviews,
          securityLogs
        }
      });
    } catch (error) {
      console.error('Get user details error:', error);
      res.status(500).json({ error: 'Failed to fetch user details', code: 'USER_DETAILS_ERROR' });
    }
  }

  // updateUser, deleteUser, getSellers, verifySeller, suspendSeller, etc.
  // → Follow the same pattern:
  // - Use SELECT ... WHERE id = ?
  // - UPDATE table SET col = ? WHERE id = ?
  // - For soft delete: UPDATE users SET deleted_at = NOW(), account_status = 'suspended' WHERE id = ?
  // - For relations (products, orders): use JOIN or separate queries

  static async approveProduct(req, res) {
    try {
      const { id } = req.params;
      await db.execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`);
      await db.execute(`UPDATE products SET status = 'approved' WHERE id = ?`, [id]);

      await AdminLog.logAction({ adminId: req.user.id, action: 'APPROVE_PRODUCT', /* ... */ });

      res.json({ success: true, message: 'Product approved' });
    } catch (error) {
      console.error('Approve product error:', error);
      res.status(500).json({ error: 'Failed to approve product', code: 'PRODUCT_APPROVE_ERROR' });
    }
  }

  // Continue similarly for deleteProductAdmin, deleteReview, getOrders (use JOINs for populate), updateOrderStatus, releaseEscrow, etc.

  /**
   * Health Check (updated)
   */
  static async healthCheck(req, res) {
    try {
      const [dbPing] = await db.query('SELECT 1 AS ping');
      const databaseHealthy = !!dbPing[0];

      // ... other checks

      res.json({
        success: true,
        data: {
          status: databaseHealthy ? 'healthy' : 'degraded',
          timestamp: new Date(),
          checks: { database: { healthy: databaseHealthy } /* ... */ }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Health check failed', code: 'HEALTH_CHECK_ERROR' });
    }
  }
}

// Update helper functions (remove mongoose.connection)
async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await db.query('SELECT 1');
    return { healthy: true, latency: `${Date.now() - start}ms` };
  } catch (e) {
    return { healthy: false, error: e.message };
  }
}

// Remove or update other helpers (checkRedisHealth etc. remain if you have them)

module.exports = AdminController;
