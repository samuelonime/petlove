const db = require('../config/database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class AdminController {

  /**
   * ADMIN LOGIN (MYSQL ONLY)
   */
  static async login(req, res) {
    try {
      const { email, password, twoFactorToken } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // Get admin
      const [rows] = await db.execute(
        'SELECT * FROM admins WHERE email = ? LIMIT 1',
        [email]
      );

      const admin = rows[0];

      if (!admin) {
        await logSecurity('admin_login_failed', req, { email, reason: 'not_found' });

        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      if (admin.is_active === 0) {
        return res.status(403).json({
          error: 'Account disabled',
          code: 'ACCOUNT_DISABLED'
        });
      }

      if (admin.is_locked === 1) {
        return res.status(403).json({
          error: 'Account locked',
          code: 'ACCOUNT_LOCKED'
        });
      }

      // NOTE: Replace with bcrypt in real production
      const isPasswordValid = password === admin.password;

      if (!isPasswordValid) {
        await db.execute(
          'UPDATE admins SET login_attempts = login_attempts + 1 WHERE id = ?',
          [admin.id]
        );

        await logSecurity('admin_login_failed', req, { email, reason: 'wrong_password' });

        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // 2FA CHECK
      if (admin.two_factor_enabled) {
        if (!twoFactorToken) {
          return res.status(400).json({
            error: '2FA required',
            code: '2FA_REQUIRED',
            requires2FA: true
          });
        }

        const verified = speakeasy.totp.verify({
          secret: admin.two_factor_secret,
          encoding: 'base32',
          token: twoFactorToken
        });

        if (!verified) {
          await logSecurity('admin_2fa_failed', req, { email });

          return res.status(401).json({
            error: 'Invalid 2FA token',
            code: 'INVALID_2FA'
          });
        }
      }

      // Reset login attempts
      await db.execute(
        'UPDATE admins SET login_attempts = 0, last_login = NOW() WHERE id = ?',
        [admin.id]
      );

      // JWT
      const accessToken = jwt.sign(
        { id: admin.id, role: admin.role },
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

      await logAction(admin.id, 'ADMIN_LOGIN', req);

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
}

/**
 * HELPERS
 */

async function logAction(adminId, action, req) {
  await db.execute(
    `INSERT INTO admin_logs 
    (admin_id, action, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, NOW())`,
    [adminId, action, req.ip, req.headers['user-agent']]
  );
}

async function logSecurity(event, req, details) {
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
}

module.exports = AdminController;
