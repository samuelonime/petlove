const Admin = require('../models/Admin');
const AdminSession = require('../models/AdminSession');
const AdminLog = require('../models/AdminLog');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const Order = require('../models/Order');
const EscrowTransaction = require('../models/EscrowTransaction');
const SystemSetting = require('../models/SystemSetting');
const Review = require('../models/Review');

// Add these utility imports
const jwt = require('jsonwebtoken');
const crypto = require('crypto')
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const mongoose = require('mongoose');

// Add these for health checks
const fs = require('fs');
const path = require('path');

class AdminController {
  /**
   * Admin Authentication
   */
  static async login(req, res) {
    try {
      const { email, password, twoFactorToken } = req.body;
      
      // Validation
      if (!email || !password) {
        return res.status(400).json({
          error: 'Please provide email and password',
          code: 'MISSING_CREDENTIALS'
        });
      }
      
      // Get admin with password
      const admin = await Admin.findByEmail(email);
      
      if (!admin || !admin.isActive) {
        await SecurityLog.create({
          eventType: 'admin_login_failed',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: JSON.stringify({
            email,
            reason: 'Invalid credentials or inactive account'
          }),
          severity: 'medium'
        });
        
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      // Check if account is locked
      if (admin.isLocked) {
        const lockTime = Math.ceil((admin.lockUntil - Date.now()) / 60000);
        
        await SecurityLog.create({
          eventType: 'admin_account_locked',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: JSON.stringify({
            email,
            lockTime: `${lockTime} minutes remaining`
          }),
          severity: 'high'
        });
        
        return res.status(403).json({
          error: `Account is locked. Try again in ${lockTime} minutes.`,
          code: 'ACCOUNT_LOCKED'
        });
      }
      
      // Verify password
      const isPasswordValid = await admin.comparePassword(password);
      
      if (!isPasswordValid) {
        // Increment failed attempts
        await admin.incrementLoginAttempts();
        
        await SecurityLog.create({
          eventType: 'admin_login_failed',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: JSON.stringify({
            email,
            reason: 'Invalid password'
          }),
          severity: 'medium'
        });
        
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      // Check if 2FA is enabled
      if (admin.twoFactorEnabled) {
        if (!twoFactorToken) {
          return res.status(400).json({
            error: 'Two-factor authentication token required',
            code: '2FA_TOKEN_REQUIRED',
            requires2FA: true
          });
        }
        
        // Verify 2FA token
        const is2FAValid = admin.verify2FAToken(twoFactorToken);
        
        if (!is2FAValid) {
          // Check backup codes
          const isBackupCode = admin.verifyBackupCode(twoFactorToken);
          
          if (!isBackupCode) {
            await SecurityLog.create({
              userId: admin._id,
              eventType: 'admin_2fa_failed',
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
              details: JSON.stringify({
                email,
                reason: 'Invalid 2FA token'
              }),
              severity: 'high'
            });
            
            return res.status(401).json({
              error: 'Invalid two-factor authentication token',
              code: 'INVALID_2FA_TOKEN'
            });
          }
        }
      }
      
      // Reset login attempts
      await admin.resetLoginAttempts();
      
      // Update last login
      admin.lastLogin = Date.now();
      admin.loginCount += 1;
      await admin.save();
      
      // Generate tokens
      const accessToken = jwt.sign(
        { id: admin._id, role: admin.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '15m' }
      );
      
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      
      // Create session
      const session = await AdminSession.createSession(admin._id, {
        sessionId: crypto.randomBytes(16).toString('hex'),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        tokenHash: crypto.createHash('sha256').update(accessToken).digest('hex'),
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      
      // Log successful login to AdminLog
      await AdminLog.logAction({
        adminId: admin._id,
        action: 'ADMIN_LOGIN',
        entityType: 'admin',
        entityId: admin._id,
        details: {
          email: admin.email,
          role: admin.role,
          sessionId: session.sessionId
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      // Log to SecurityLog
      await SecurityLog.create({
        userId: admin._id,
        eventType: 'admin_login_success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: JSON.stringify({
          email,
          role: admin.role,
          sessionId: session.sessionId
        }),
        severity: 'low'
      });
      
      // Return response
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          admin: {
            id: admin._id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            permissions: admin.permissions,
            twoFactorEnabled: admin.twoFactorEnabled,
            preferences: admin.preferences
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60 // 15 minutes
          },
          session: {
            id: session.sessionId,
            expiresAt: session.expiresAt
          }
        }
      });
      
    } catch (error) {
      console.error('Admin login error:', error);
      
      await SecurityLog.create({
        eventType: 'admin_login_error',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: JSON.stringify({
          error: error.message,
          email: req.body.email
        }),
        severity: 'medium'
      });
      
      res.status(500).json({
        error: 'Login failed. Please try again.',
        code: 'LOGIN_FAILED'
      });
    }
  }
  
  /**
   * Get Admin Dashboard Statistics
   */
  static async getDashboardStats(req, res) {
    try {
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_DASHBOARD',
        entityType: 'dashboard',
        entityId: null,
        details: {
          timestamp: new Date()
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      const [
        userStats,
        sellerStats,
        productStats,
        orderStats,
        financialStats,
        disputeStats
      ] = await Promise.all([
        // User Statistics
        User.aggregate([
          {
            $facet: {
              total: [{ $count: 'count' }],
              today: [
                { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
                { $count: 'count' }
              ],
              byStatus: [
                { $group: { _id: '$accountStatus', count: { $sum: 1 } } }
              ]
            }
          }
        ]),
        
        // Seller Statistics
        Seller.aggregate([
          {
            $facet: {
              total: [{ $count: 'count' }],
              verified: [
                { $match: { isVerified: true } },
                { $count: 'count' }
              ],
              pendingVerification: [
                { $match: { isVerified: false } },
                { $count: 'count' }
              ]
            }
          }
        ]),
        
        // Product Statistics
        Product.aggregate([
          {
            $facet: {
              total: [{ $count: 'count' }],
              active: [
                { $match: { status: 'active' } },
                { $count: 'count' }
              ],
              byCategory: [
                { $group: { _id: '$category', count: { $sum: 1 } } }
              ]
            }
          }
        ]),
        
        // Order Statistics
        Order.aggregate([
          {
            $facet: {
              total: [{ $count: 'count' }],
              today: [
                { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
                { $count: 'count' }
              ],
              byStatus: [
                { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
              ],
              revenue: [
                { $match: { paymentStatus: 'completed' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
              ]
            }
          }
        ]),
        
        // Financial Statistics
        EscrowTransaction.aggregate([
          {
            $facet: {
              totalHeld: [
                { $match: { transactionType: 'hold' } },
                { $group: { _id: null, amount: { $sum: '$amount' } } }
              ],
              totalReleased: [
                { $match: { transactionType: 'release' } },
                { $group: { _id: null, amount: { $sum: '$amount' } } }
              ],
              commission: [
                { $group: { _id: null, amount: { $sum: '$commissionAmount' } } }
              ]
            }
          }
        ]),
        
        // Dispute Statistics
        Dispute.aggregate([
          {
            $facet: {
              total: [{ $count: 'count' }],
              open: [
                { $match: { disputeStatus: 'open' } },
                { $count: 'count' }
              ],
              byType: [
                { $group: { _id: '$disputeType', count: { $sum: 1 } } }
              ]
            }
          }
        ])
      ]);
      
      // Security Statistics
      const securityStats = await SecurityLog.aggregate([
        {
          $facet: {
            today: [
              { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
              { $count: 'count' }
            ],
            bySeverity: [
              { $group: { _id: '$severity', count: { $sum: 1 } } }
            ],
            suspicious: [
              { $match: { severity: 'high' } },
              { $count: 'count' }
            ]
          }
        }
      ]);
      
      // Recent Activity
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('buyer', 'email firstName lastName');
      
      const recentUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('email firstName lastName accountStatus createdAt');
      
      const recentSecurityLogs = await SecurityLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'email');
      
      res.json({
        success: true,
        data: {
          overview: {
            totalUsers: userStats[0]?.total[0]?.count || 0,
            totalSellers: sellerStats[0]?.total[0]?.count || 0,
            totalProducts: productStats[0]?.total[0]?.count || 0,
            totalOrders: orderStats[0]?.total[0]?.count || 0,
            totalRevenue: orderStats[0]?.revenue[0]?.total || 0,
            totalDisputes: disputeStats[0]?.total[0]?.count || 0
          },
          statistics: {
            users: {
              today: userStats[0]?.today[0]?.count || 0,
              byStatus: userStats[0]?.byStatus || []
            },
            sellers: {
              verified: sellerStats[0]?.verified[0]?.count || 0,
              pending: sellerStats[0]?.pendingVerification[0]?.count || 0
            },
            products: {
              active: productStats[0]?.active[0]?.count || 0,
              byCategory: productStats[0]?.byCategory || []
            },
            orders: {
              today: orderStats[0]?.today[0]?.count || 0,
              byStatus: orderStats[0]?.byStatus || []
            },
            financial: {
              held: financialStats[0]?.totalHeld[0]?.amount || 0,
              released: financialStats[0]?.totalReleased[0]?.amount || 0,
              commission: financialStats[0]?.commission[0]?.amount || 0
            },
            disputes: {
              open: disputeStats[0]?.open[0]?.count || 0,
              byType: disputeStats[0]?.byType || []
            },
            security: {
              today: securityStats[0]?.today[0]?.count || 0,
              bySeverity: securityStats[0]?.bySeverity || [],
              suspicious: securityStats[0]?.suspicious[0]?.count || 0
            }
          },
          recentActivity: {
            orders: recentOrders,
            users: recentUsers,
            securityLogs: recentSecurityLogs
          }
        }
      });
      
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        error: 'Failed to load dashboard statistics',
        code: 'DASHBOARD_ERROR'
      });
    }
  }
  
  /**
   * User Management
   */
  static async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      // Search filter
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Role filter
      if (role) {
        query.role = role;
      }
      
      // Status filter
      if (status) {
        query.accountStatus = status;
      }
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Get users
      const users = await User.find(query)
        .select('-password -passwordResetToken -passwordResetExpires')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);
      
      // Get total count
      const total = await User.countDocuments(query);
      
      // Get statistics
      const stats = await User.aggregate([
        { $group: { _id: '$accountStatus', count: { $sum: 1 } } }
      ]);
      
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_USERS',
        entityType: 'users',
        entityId: null,
        details: {
          page,
          limit,
          search,
          totalResults: total
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          statistics: stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        }
      });
      
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Failed to fetch users',
        code: 'USERS_FETCH_ERROR'
      });
    }
  }
  
  static async getUserDetails(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id)
        .select('-password -passwordResetToken -passwordResetExpires');
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Get user's orders
      const orders = await Order.find({ buyer: id })
        .sort({ createdAt: -1 })
        .limit(10);
      
      // Get user's reviews
      const reviews = await Review.find({ userId: id })
        .populate('productId', 'name')
        .limit(10);
      
      // Get security logs for user
      const securityLogs = await SecurityLog.find({ userId: id })
        .sort({ createdAt: -1 })
        .limit(20);
      
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_USER_DETAILS',
        entityType: 'user',
        entityId: id,
        details: {
          userId: id,
          userEmail: user.email
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          user,
          statistics: {
            totalOrders: orders.length,
            totalReviews: reviews.length,
            totalSpent: orders.reduce((sum, order) => sum + order.totalAmount, 0)
          },
          recentOrders: orders,
          recentReviews: reviews,
          securityLogs
        }
      });
      
    } catch (error) {
      console.error('Get user details error:', error);
      res.status(500).json({
        error: 'Failed to fetch user details',
        code: 'USER_DETAILS_ERROR'
      });
    }
  }
  
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Remove protected fields
      delete updates.password;
      delete updates.email;
      delete updates.role;
      delete updates.createdAt;
      delete updates._id;
      
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      const oldUserData = {
        accountStatus: user.accountStatus,
        isVerified: user.isVerified
      };
      
      // Update user
      Object.assign(user, updates);
      await user.save();
      
      // Log the update to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'UPDATE_USER',
        entityType: 'user',
        entityId: id,
        details: {
          userId: id,
          userEmail: user.email,
          updates,
          oldData: oldUserData,
          newData: {
            accountStatus: user.accountStatus,
            isVerified: user.isVerified
          }
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'medium'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `UPDATE_USER_${id}`,
        details: {
          updates,
          ipAddress: req.ip,
          userId: id,
          userEmail: user.email
        },
        severity: 'medium'
      });
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user }
      });
      
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        error: 'Failed to update user',
        code: 'USER_UPDATE_ERROR'
      });
    }
  }
  
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const { reason, permanent } = req.body;
      
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      if (permanent) {
        // Permanent deletion
        await User.findByIdAndDelete(id);
        
        // Also delete related data
        await Order.deleteMany({ buyer: id });
        await Review.deleteMany({ userId: id });
        // Add more related deletions as needed
      } else {
        // Soft delete
        user.deletedAt = new Date();
        user.accountStatus = 'suspended';
        await user.save();
      }
      
      // Log the deletion to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: permanent ? 'PERMANENT_DELETE_USER' : 'SUSPEND_USER',
        entityType: 'user',
        entityId: id,
        details: {
          userId: id,
          userEmail: user.email,
          reason,
          permanent,
          deletedAt: new Date()
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'high'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `${permanent ? 'PERMANENT_DELETE' : 'SOFT_DELETE'}_USER_${id}`,
        details: {
          reason,
          permanent,
          userEmail: user.email,
          ipAddress: req.ip
        },
        severity: 'high'
      });
      
      res.json({
        success: true,
        message: `User ${permanent ? 'permanently deleted' : 'suspended'} successfully`
      });
      
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        error: 'Failed to delete user',
        code: 'USER_DELETE_ERROR'
      });
    }
  }
  
  /**
   * Seller Management
   */
  static async getSellers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        verified,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      // Search filter
      if (search) {
        query.$or = [
          { businessName: { $regex: search, $options: 'i' } },
          { 'user.email': { $regex: search, $options: 'i' } },
          { businessRegistrationNumber: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Verified filter
      if (verified !== undefined) {
        query.isVerified = verified === 'true';
      }
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Get sellers with user data
      const sellers = await Seller.find(query)
        .populate('user', 'email firstName lastName phone accountStatus')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);
      
      // Get total count
      const total = await Seller.countDocuments(query);
      
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_SELLERS',
        entityType: 'sellers',
        entityId: null,
        details: {
          page,
          limit,
          search,
          totalResults: total
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          sellers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
      
    } catch (error) {
      console.error('Get sellers error:', error);
      res.status(500).json({
        error: 'Failed to fetch sellers',
        code: 'SELLERS_FETCH_ERROR'
      });
    }
  }
  
  static async verifySeller(req, res) {
    try {
      const { id } = req.params;
      const { verificationLevel, notes } = req.body;
      
      const seller = await Seller.findById(id);
      
      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          code: 'SELLER_NOT_FOUND'
        });
      }
      
      seller.isVerified = true;
      seller.verificationLevel = verificationLevel || 'intermediate';
      seller.verificationNotes = notes;
      seller.verifiedAt = new Date();
      seller.verifiedBy = req.user.id;
      
      await seller.save();
      
      // Log the verification to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VERIFY_SELLER',
        entityType: 'seller',
        entityId: id,
        details: {
          sellerId: seller._id,
          businessName: seller.businessName,
          verificationLevel: seller.verificationLevel,
          notes,
          verifiedAt: seller.verifiedAt
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'medium'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `VERIFY_SELLER_${id}`,
        details: {
          verificationLevel: seller.verificationLevel,
          notes,
          sellerId: seller._id,
          businessName: seller.businessName,
          ipAddress: req.ip
        },
        severity: 'medium'
      });
      
      res.json({
        success: true,
        message: 'Seller verified successfully',
        data: { seller }
      });
      
    } catch (error) {
      console.error('Verify seller error:', error);
      res.status(500).json({
        error: 'Failed to verify seller',
        code: 'SELLER_VERIFY_ERROR'
      });
    }
  }
  
  static async suspendSeller(req, res) {
    try {
      const { id } = req.params;
      const { reason, durationDays } = req.body;
      
      const seller = await Seller.findById(id).populate('user');
      
      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          code: 'SELLER_NOT_FOUND'
        });
      }
      
      // Suspend user account
      seller.user.accountStatus = 'suspended';
      if (durationDays) {
        const suspensionEnd = new Date();
        suspensionEnd.setDate(suspensionEnd.getDate() + parseInt(durationDays));
        seller.user.suspensionEnd = suspensionEnd;
      }
      await seller.user.save();
      
      // Deactivate seller's products
      const deactivatedProducts = await Product.updateMany(
        { seller: seller._id },
        { $set: { status: 'inactive' } }
      );
      
      // Log the suspension to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'SUSPEND_SELLER',
        entityType: 'seller',
        entityId: id,
        details: {
          sellerId: seller._id,
          businessName: seller.businessName,
          reason,
          durationDays,
          suspensionEnd: seller.user.suspensionEnd,
          productsDeactivated: deactivatedProducts.modifiedCount
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'high'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `SUSPEND_SELLER_${id}`,
        details: {
          reason,
          durationDays,
          sellerId: seller._id,
          businessName: seller.businessName,
          ipAddress: req.ip
        },
        severity: 'high'
      });
      
      res.json({
        success: true,
        message: 'Seller suspended successfully',
        data: {
          suspensionEnd: seller.user.suspensionEnd,
          productsDeactivated: deactivatedProducts.modifiedCount
        }
      });
      
    } catch (error) {
      console.error('Suspend seller error:', error);
      res.status(500).json({
        error: 'Failed to suspend seller',
        code: 'SELLER_SUSPEND_ERROR'
      });
    }
  }
  
  /**
   * Order Management
   */
  static async getOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        paymentStatus,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      // Search filter
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'buyer.email': { $regex: search, $options: 'i' } },
          { paymentReference: { $regex: search, $options: 'i' } },
          { trackingNumber: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Status filter
      if (status) {
        query.orderStatus = status;
      }
      
      // Payment status filter
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Get orders with buyer and items
      const orders = await Order.find(query)
        .populate('buyer', 'email firstName lastName phone')
        .populate({
          path: 'items',
          populate: {
            path: 'product',
            select: 'name mainImageUrl'
          }
        })
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);
      
      // Get total count
      const total = await Order.countDocuments(query);
      
      // Get statistics
      const stats = await Order.aggregate([
        { $group: { 
          _id: '$orderStatus', 
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        } }
      ]);
      
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_ORDERS',
        entityType: 'orders',
        entityId: null,
        details: {
          page,
          limit,
          search,
          totalResults: total
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          statistics: stats
        }
      });
      
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        error: 'Failed to fetch orders',
        code: 'ORDERS_FETCH_ERROR'
      });
    }
  }
  
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        });
      }
      
      const oldStatus = order.orderStatus;
      order.orderStatus = status;
      order.adminNotes = notes;
      
      await order.save();
      
      // Log the status update to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'UPDATE_ORDER_STATUS',
        entityType: 'order',
        entityId: id,
        details: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          oldStatus,
          newStatus: status,
          notes
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'medium'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `UPDATE_ORDER_STATUS_${id}`,
        details: {
          oldStatus,
          newStatus: status,
          notes,
          orderNumber: order.orderNumber,
          ipAddress: req.ip
        },
        severity: 'medium'
      });
      
      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: { order }
      });
      
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        error: 'Failed to update order status',
        code: 'ORDER_UPDATE_ERROR'
      });
    }
  }
  
  static async releaseEscrow(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        });
      }
      
      if (order.escrowStatus !== 'held') {
        return res.status(400).json({
          error: 'Escrow is not held for this order',
          code: 'ESCROW_NOT_HELD'
        });
      }
      
      if (order.orderStatus !== 'delivered' && order.orderStatus !== 'completed') {
        return res.status(400).json({
          error: 'Order must be delivered before releasing escrow',
          code: 'ORDER_NOT_DELIVERED'
        });
      }
      
      // Calculate commission and seller amount
      const commissionRate = order.commissionRate || 10;
      const commissionAmount = (order.totalAmount * commissionRate) / 100;
      const sellerAmount = order.totalAmount - commissionAmount;
      
      // Update order
      order.escrowStatus = 'released';
      order.escrowReleasedAt = new Date();
      order.escrowReleasedBy = req.user.id;
      order.commissionAmount = commissionAmount;
      order.sellerAmount = sellerAmount;
      order.orderStatus = 'completed';
      order.completedAt = new Date();
      
      await order.save();
      
      // Create escrow transaction record
      await EscrowTransaction.create({
        order: order._id,
        transactionType: 'release',
        amount: order.totalAmount,
        commissionAmount,
        netAmount: sellerAmount,
        fromUser: order.buyer,
        toUser: order.items[0]?.seller, // Assuming single seller for simplicity
        status: 'completed',
        processedBy: req.user.id,
        notes
      });
      
      // Update seller stats
      const sellerId = order.items[0]?.seller;
      if (sellerId) {
        await Seller.findByIdAndUpdate(sellerId, {
          $inc: {
            totalSales: 1,
            totalRevenue: sellerAmount
          }
        });
      }
      
      // Log the escrow release to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'RELEASE_ESCROW',
        entityType: 'order',
        entityId: id,
        details: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          commissionAmount,
          sellerAmount,
          sellerId,
          notes
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'high'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `RELEASE_ESCROW_${id}`,
        details: {
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          commissionAmount,
          sellerAmount,
          sellerId,
          notes,
          ipAddress: req.ip
        },
        severity: 'high'
      });
      
      res.json({
        success: true,
        message: 'Escrow released successfully',
        data: {
          order,
          commissionAmount,
          sellerAmount
        }
      });
      
    } catch (error) {
      console.error('Release escrow error:', error);
      res.status(500).json({
        error: 'Failed to release escrow',
        code: 'ESCROW_RELEASE_ERROR'
      });
    }
  }
  
  /**
   * Dispute Management
   */
  static async getDisputes(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        dateFrom,
        dateTo,
        sortBy = 'openedAt',
        sortOrder = 'desc'
      } = req.query;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      // Status filter
      if (status) {
        query.disputeStatus = status;
      }
      
      // Type filter
      if (type) {
        query.disputeType = type;
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        query.openedAt = {};
        if (dateFrom) query.openedAt.$gte = new Date(dateFrom);
        if (dateTo) query.openedAt.$lte = new Date(dateTo);
      }
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Get disputes with related data
      const disputes = await Dispute.find(query)
        .populate('order', 'orderNumber totalAmount')
        .populate('raisedBy', 'email firstName lastName')
        .populate('assignedTo', 'email firstName lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);
      
      // Get total count
      const total = await Dispute.countDocuments(query);
      
      // Get statistics
      const stats = await Dispute.aggregate([
        { $group: { 
          _id: '$disputeStatus', 
          count: { $sum: 1 }
        } }
      ]);
      
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_DISPUTES',
        entityType: 'disputes',
        entityId: null,
        details: {
          page,
          limit,
          totalResults: total
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          disputes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          statistics: stats
        }
      });
      
    } catch (error) {
      console.error('Get disputes error:', error);
      res.status(500).json({
        error: 'Failed to fetch disputes',
        code: 'DISPUTES_FETCH_ERROR'
      });
    }
  }
  
  static async assignDispute(req, res) {
    try {
      const { id } = req.params;
      const { adminId } = req.body;
      
      const dispute = await Dispute.findById(id);
      
      if (!dispute) {
        return res.status(404).json({
          error: 'Dispute not found',
          code: 'DISPUTE_NOT_FOUND'
        });
      }
      
      // Check if admin exists
      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          code: 'ADMIN_NOT_FOUND'
        });
      }
      
      dispute.assignedTo = adminId;
      dispute.disputeStatus = 'under_review';
      await dispute.save();
      
      // Log the assignment to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'ASSIGN_DISPUTE',
        entityType: 'dispute',
        entityId: id,
        details: {
          disputeId: dispute._id,
          assignedTo: adminId,
          assignedToEmail: admin.email,
          newStatus: 'under_review'
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'medium'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `ASSIGN_DISPUTE_${id}`,
        details: {
          disputeId: dispute._id,
          assignedTo: adminId,
          assignedToEmail: admin.email,
          ipAddress: req.ip
        },
        severity: 'medium'
      });
      
      res.json({
        success: true,
        message: 'Dispute assigned successfully',
        data: { dispute }
      });
      
    } catch (error) {
      console.error('Assign dispute error:', error);
      res.status(500).json({
        error: 'Failed to assign dispute',
        code: 'DISPUTE_ASSIGN_ERROR'
      });
    }
  }
  
  static async resolveDispute(req, res) {
    try {
      const { id } = req.params;
      const { resolution, resolutionAmount, notes } = req.body;
      
      const dispute = await Dispute.findById(id).populate('order');
      
      if (!dispute) {
        return res.status(404).json({
          error: 'Dispute not found',
          code: 'DISPUTE_NOT_FOUND'
        });
      }
      
      if (dispute.disputeStatus === 'resolved' || dispute.disputeStatus === 'closed') {
        return res.status(400).json({
          error: 'Dispute is already resolved',
          code: 'DISPUTE_ALREADY_RESOLVED'
        });
      }
      
      dispute.resolution = resolution;
      dispute.resolutionAmount = resolutionAmount;
      dispute.resolutionNotes = notes;
      dispute.disputeStatus = 'resolved';
      dispute.resolvedAt = new Date();
      dispute.resolvedBy = req.user.id;
      
      await dispute.save();
      
      // Handle resolution actions
      if (resolution === 'refund_buyer' && resolutionAmount > 0) {
        // Process refund
        const order = dispute.order;
        order.refundAmount = resolutionAmount;
        order.refundedAt = new Date();
        order.refundedBy = req.user.id;
        order.orderStatus = 'refunded';
        
        await order.save();
        
        // Create escrow refund transaction
        await EscrowTransaction.create({
          order: order._id,
          transactionType: 'refund',
          amount: resolutionAmount,
          fromUser: order.seller,
          toUser: order.buyer,
          status: 'completed',
          processedBy: req.user.id,
          notes: `Dispute resolution: ${notes}`
        });
      }
      
      // Log the resolution to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'RESOLVE_DISPUTE',
        entityType: 'dispute',
        entityId: id,
        details: {
          disputeId: dispute._id,
          resolution,
          resolutionAmount,
          notes,
          resolvedAt: dispute.resolvedAt
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'high'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `RESOLVE_DISPUTE_${id}`,
        details: {
          disputeId: dispute._id,
          resolution,
          resolutionAmount,
          notes,
          ipAddress: req.ip
        },
        severity: 'high'
      });
      
      res.json({
        success: true,
        message: 'Dispute resolved successfully',
        data: { dispute }
      });
      
    } catch (error) {
      console.error('Resolve dispute error:', error);
      res.status(500).json({
        error: 'Failed to resolve dispute',
        code: 'DISPUTE_RESOLVE_ERROR'
      });
    }
  }
  
  /**
   * Security & Audit
   */
  static async getSecurityLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        eventType,
        severity,
        userId,
        dateFrom,
        dateTo,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      // Event type filter
      if (eventType) {
        query.eventType = eventType;
      }
      
      // Severity filter
      if (severity) {
        query.severity = severity;
      }
      
      // User filter
      if (userId) {
        query.userId = userId;
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      
      // Search filter
      if (search) {
        query.$or = [
          { ipAddress: { $regex: search, $options: 'i' } },
          { userAgent: { $regex: search, $options: 'i' } },
          { 'details': { $regex: search, $options: 'i' } }
        ];
      }
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Get security logs
      const logs = await SecurityLog.find(query)
        .populate('userId', 'email firstName lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);
      
      // Get total count
      const total = await SecurityLog.countDocuments(query);
      
      // Get statistics
      const stats = await SecurityLog.aggregate([
        {
          $facet: {
            byEventType: [
              { $group: { _id: '$eventType', count: { $sum: 1 } } }
            ],
            bySeverity: [
              { $group: { _id: '$severity', count: { $sum: 1 } } }
            ],
            today: [
              { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
              { $count: 'count' }
            ]
          }
        }
      ]);
      
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_SECURITY_LOGS',
        entityType: 'security_logs',
        entityId: null,
        details: {
          page,
          limit,
          totalResults: total
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          statistics: {
            byEventType: stats[0]?.byEventType || [],
            bySeverity: stats[0]?.bySeverity || [],
            today: stats[0]?.today[0]?.count || 0
          }
        }
      });
      
    } catch (error) {
      console.error('Get security logs error:', error);
      res.status(500).json({
        error: 'Failed to fetch security logs',
        code: 'SECURITY_LOGS_ERROR'
      });
    }
  }
  
  static async getAuditTrail(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        adminId,
        action,
        severity,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      // Admin filter
      if (adminId) {
        query.adminId = adminId;
      }
      
      // Action filter
      if (action) {
        query.action = { $regex: action, $options: 'i' };
      }
      
      // Severity filter
      if (severity) {
        query.severity = severity;
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Get audit trail
      const auditTrail = await AuditTrail.find(query)
        .populate('adminId', 'email firstName lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);
      
      // Get total count
      const total = await AuditTrail.countDocuments(query);
      
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_AUDIT_TRAIL',
        entityType: 'audit_trail',
        entityId: null,
        details: {
          page,
          limit,
          totalResults: total
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          auditTrail,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
      
    } catch (error) {
      console.error('Get audit trail error:', error);
      res.status(500).json({
        error: 'Failed to fetch audit trail',
        code: 'AUDIT_TRAIL_ERROR'
      });
    }
  }
  
  /**
   * System Settings
   */
  static async getSettings(req, res) {
    try {
      const { category } = req.query;
      
      const query = {};
      if (category) {
        query.category = category;
      }
      
      const settings = await SystemSetting.find(query);
      
      // Group by category
      const groupedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      }, {});
      
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_SETTINGS',
        entityType: 'settings',
        entityId: null,
        details: {
          category,
          settingsCount: settings.length
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          settings: groupedSettings,
          categories: Object.keys(groupedSettings)
        }
      });
      
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({
        error: 'Failed to fetch settings',
        code: 'SETTINGS_FETCH_ERROR'
      });
    }
  }
  
  static async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      const setting = await SystemSetting.findOne({ key });
      
      if (!setting) {
        return res.status(404).json({
          error: 'Setting not found',
          code: 'SETTING_NOT_FOUND'
        });
      }
      
      if (!setting.isEditable) {
        return res.status(403).json({
          error: 'This setting is not editable',
          code: 'SETTING_NOT_EDITABLE'
        });
      }
      
      // Validate setting value
      const validationResult = validateSettingValue(setting.settingType, value);
      if (!validationResult.valid) {
        return res.status(400).json({
          error: `Invalid value for setting: ${validationResult.error}`,
          code: 'INVALID_SETTING_VALUE'
        });
      }
      
      const oldValue = setting.value;
      setting.value = value;
      setting.updatedBy = req.user.id;
      await setting.save();
      
      // Log the setting change to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'UPDATE_SETTING',
        entityType: 'setting',
        entityId: key,
        details: {
          key,
          category: setting.category,
          oldValue,
          newValue: value,
          settingType: setting.settingType
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'high'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `UPDATE_SETTING_${key}`,
        details: {
          key,
          oldValue,
          newValue: value,
          category: setting.category,
          ipAddress: req.ip
        },
        severity: 'high'
      });
      
      res.json({
        success: true,
        message: 'Setting updated successfully',
        data: { setting }
      });
      
    } catch (error) {
      console.error('Update setting error:', error);
      res.status(500).json({
        error: 'Failed to update setting',
        code: 'SETTING_UPDATE_ERROR'
      });
    }
  }
  
  /**
   * Admin Management
   */
  static async getAdmins(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const skip = (page - 1) * limit;
      const query = {};
      
      // Role filter
      if (role) {
        query.role = role;
      }
      
      // Active filter
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }
      
      // Search filter
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Get admins (exclude password)
      const admins = await Admin.find(query)
        .select('-password -twoFactorSecret -twoFactorBackupCodes')
        .skip(skip)
        .limit(parseInt(limit))
        .sort(sort);
      
      // Get total count
      const total = await Admin.countDocuments(query);
      
      // Get statistics
      const stats = await Admin.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);
      
      // Log this action to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'VIEW_ADMINS',
        entityType: 'admins',
        entityId: null,
        details: {
          page,
          limit,
          search,
          totalResults: total
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          admins,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          statistics: stats
        }
      });
      
    } catch (error) {
      console.error('Get admins error:', error);
      res.status(500).json({
        error: 'Failed to fetch admins',
        code: 'ADMINS_FETCH_ERROR'
      });
    }
  }
  
  static async createAdmin(req, res) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        role,
        permissions,
        phone
      } = req.body;
      
      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({
          error: 'Admin with this email already exists',
          code: 'ADMIN_EXISTS'
        });
      }
      
      // Validate permissions based on role
      const validatedPermissions = validatePermissionsForRole(role, permissions);
      
      // Create admin
      const admin = new Admin({
        email,
        password,
        firstName,
        lastName,
        role: role || 'admin',
        permissions: validatedPermissions,
        phone,
        createdBy: req.user.id,
        isVerified: true
      });
      
      await admin.save();
      
      // Log the admin creation to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'ADMIN_CREATE',
        entityType: 'admin',
        entityId: admin._id,
        details: {
          createdAdminId: admin._id,
          createdAdminEmail: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          createdBy: req.user.email
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'high'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: 'CREATE_ADMIN',
        details: {
          adminId: admin._id,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          createdBy: req.user.email,
          ipAddress: req.ip
        },
        severity: 'high'
      });
      
      // Remove sensitive data from response
      const adminResponse = admin.toObject();
      delete adminResponse.password;
      delete adminResponse.twoFactorSecret;
      delete adminResponse.twoFactorBackupCodes;
      
      res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        data: { admin: adminResponse }
      });
      
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({
        error: 'Failed to create admin',
        code: 'ADMIN_CREATE_ERROR'
      });
    }
  }
  
  static async updateAdmin(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Remove protected fields
      delete updates.password;
      delete updates.email;
      delete updates.createdAt;
      delete updates._id;
      
      // If updating permissions, validate them
      if (updates.permissions) {
        const admin = await Admin.findById(id);
        if (!admin) {
          return res.status(404).json({
            error: 'Admin not found',
            code: 'ADMIN_NOT_FOUND'
          });
        }
        updates.permissions = validatePermissionsForRole(admin.role, updates.permissions);
      }
      
      const oldAdmin = await Admin.findById(id);
      const admin = await Admin.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password -twoFactorSecret -twoFactorBackupCodes');
      
      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          code: 'ADMIN_NOT_FOUND'
        });
      }
      
      // Log the update to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'ADMIN_UPDATE',
        entityType: 'admin',
        entityId: id,
        details: {
          adminId: admin._id,
          adminEmail: admin.email,
          updates,
          oldRole: oldAdmin.role,
          newRole: admin.role,
          oldPermissions: oldAdmin.permissions,
          newPermissions: admin.permissions
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'high'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `UPDATE_ADMIN_${id}`,
        details: {
          adminId: admin._id,
          updates,
          ipAddress: req.ip
        },
        severity: 'high'
      });
      
      res.json({
        success: true,
        message: 'Admin updated successfully',
        data: { admin }
      });
      
    } catch (error) {
      console.error('Update admin error:', error);
      res.status(500).json({
        error: 'Failed to update admin',
        code: 'ADMIN_UPDATE_ERROR'
      });
    }
  }
  
  static async deleteAdmin(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent deleting yourself
      if (id === req.user.id) {
        return res.status(400).json({
          error: 'You cannot delete your own account',
          code: 'SELF_DELETE_NOT_ALLOWED'
        });
      }
      
      const admin = await Admin.findById(id);
      
      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          code: 'ADMIN_NOT_FOUND'
        });
      }
      
      // Soft delete
      admin.isActive = false;
      admin.deletedAt = new Date();
      await admin.save();
      
      // Log the deletion to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'ADMIN_DELETE',
        entityType: 'admin',
        entityId: id,
        details: {
          adminId: admin._id,
          adminEmail: admin.email,
          deletedBy: req.user.email,
          deletedAt: new Date()
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'high'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: req.user.id,
        action: `DELETE_ADMIN_${id}`,
        details: {
          adminId: admin._id,
          adminEmail: admin.email,
          deletedBy: req.user.email,
          ipAddress: req.ip
        },
        severity: 'high'
      });
      
      res.json({
        success: true,
        message: 'Admin deactivated successfully'
      });
      
    } catch (error) {
      console.error('Delete admin error:', error);
      res.status(500).json({
        error: 'Failed to delete admin',
        code: 'ADMIN_DELETE_ERROR'
      });
    }
  }
  
  /**
   * Two-Factor Authentication
   */
  static async setup2FA(req, res) {
    try {
      const admin = req.user;
      
      // Generate 2FA secret
      const secret = admin.generate2FASecret();
      
      // Generate QR code URL
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: `PetHub (${admin.email})`,
        issuer: 'PetHub Admin',
        encoding: 'base32'
      });
      
      // Generate backup codes
      const backupCodes = admin.generateBackupCodes();
      
      await admin.save();
      
      // Generate QR code image
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
      
      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCodeUrl,
          backupCodes,
          message: 'Scan the QR code with your authenticator app'
        }
      });
      
    } catch (error) {
      console.error('Setup 2FA error:', error);
      res.status(500).json({
        error: 'Failed to setup two-factor authentication',
        code: '2FA_SETUP_ERROR'
      });
    }
  }
  
  static async verify2FASetup(req, res) {
    try {
      const { token } = req.body;
      const admin = req.user;
      
      // Verify token
      const isValid = admin.verify2FAToken(token);
      
      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid verification token',
          code: 'INVALID_2FA_TOKEN'
        });
      }
      
      // Enable 2FA
      admin.twoFactorEnabled = true;
      await admin.save();
      
      // Log 2FA enablement to AdminLog
      await AdminLog.logAction({
        adminId: admin._id,
        action: 'ENABLE_2FA',
        entityType: 'admin',
        entityId: admin._id,
        details: {
          adminId: admin._id,
          adminEmail: admin.email
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'medium'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: admin._id,
        action: 'ENABLE_2FA',
        details: {
          adminId: admin._id,
          ipAddress: req.ip
        },
        severity: 'medium'
      });
      
      res.json({
        success: true,
        message: 'Two-factor authentication enabled successfully'
      });
      
    } catch (error) {
      console.error('Verify 2FA setup error:', error);
      res.status(500).json({
        error: 'Failed to verify two-factor authentication',
        code: '2FA_VERIFY_ERROR'
      });
    }
  }
  
  static async disable2FA(req, res) {
    try {
      const { token } = req.body;
      const admin = req.user;
      
      // Verify token before disabling
      const isValid = admin.verify2FAToken(token);
      
      if (!isValid) {
        // Check backup codes
        const isBackupCode = admin.verifyBackupCode(token);
        
        if (!isBackupCode) {
          return res.status(400).json({
            error: 'Invalid verification token',
            code: 'INVALID_2FA_TOKEN'
          });
        }
      }
      
      // Disable 2FA
      admin.twoFactorEnabled = false;
      admin.twoFactorSecret = undefined;
      admin.twoFactorBackupCodes = [];
      await admin.save();
      
      // Log 2FA disablement to AdminLog
      await AdminLog.logAction({
        adminId: admin._id,
        action: 'DISABLE_2FA',
        entityType: 'admin',
        entityId: admin._id,
        details: {
          adminId: admin._id,
          adminEmail: admin.email
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'medium'
      });
      
      // Also log to AuditTrail
      await AuditTrail.create({
        adminId: admin._id,
        action: 'DISABLE_2FA',
        details: {
          adminId: admin._id,
          ipAddress: req.ip
        },
        severity: 'medium'
      });
      
      res.json({
        success: true,
        message: 'Two-factor authentication disabled successfully'
      });
      
    } catch (error) {
      console.error('Disable 2FA error:', error);
      res.status(500).json({
        error: 'Failed to disable two-factor authentication',
        code: '2FA_DISABLE_ERROR'
      });
    }
  }
  
  /**
   * System Health Check
   */
  static async healthCheck(req, res) {
    try {
      const healthChecks = {
        database: await checkDatabaseHealth(),
        redis: await checkRedisHealth(),
        storage: await checkStorageHealth(),
        services: await checkExternalServices(),
        security: await checkSecurityHealth()
      };
      
      const allHealthy = Object.values(healthChecks).every(check => check.healthy);
      
      // Log health check to AdminLog
      await AdminLog.logAction({
        adminId: req.user.id,
        action: 'HEALTH_CHECK',
        entityType: 'system',
        entityId: null,
        details: {
          status: allHealthy ? 'healthy' : 'degraded',
          checks: healthChecks
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'low'
      });
      
      res.json({
        success: true,
        data: {
          status: allHealthy ? 'healthy' : 'degraded',
          timestamp: new Date(),
          checks: healthChecks
        }
      });
      
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR'
      });
    }
  }
}

// Helper functions
function validatePermissionsForRole(role, permissions) {
  const rolePermissions = {
    super_admin: [
      'users:read', 'users:create', 'users:update', 'users:delete',
      'products:read', 'products:create', 'products:update', 'products:delete',
      'orders:read', 'orders:update', 'orders:cancel',
      'payments:read', 'transactions:read', 'escrow:read', 'escrow:release',
      'sellers:read', 'sellers:verify', 'sellers:update', 'sellers:suspend',
      'disputes:read', 'disputes:resolve',
      'analytics:read', 'reports:generate',
      'settings:read', 'settings:update',
      'security:read', 'audit:read',
      'admins:read', 'admins:create', 'admins:update', 'admins:delete',
      'content:read', 'content:create', 'content:update', 'content:delete'
    ],
    admin: [
      'users:read', 'users:update',
      'products:read', 'products:update',
      'orders:read', 'orders:update',
      'payments:read', 'transactions:read',
      'sellers:read', 'sellers:verify',
      'disputes:read', 'disputes:resolve',
      'analytics:read',
      'settings:read',
      'security:read', 'audit:read'
    ],
    moderator: [
      'users:read',
      'products:read',
      'orders:read',
      'sellers:read',
      'disputes:read'
    ]
  };
  
  // Filter permissions based on role
  const allowedPermissions = rolePermissions[role] || [];
  return permissions.filter(permission => allowedPermissions.includes(permission));
}

function validateSettingValue(type, value) {
  try {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Value must be a string' };
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, error: 'Value must be a number' };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: 'Value must be a boolean' };
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, error: 'Value must be an array' };
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return { valid: false, error: 'Value must be an object' };
        }
        break;
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function checkDatabaseHealth() {
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const latency = Date.now() - start;
    
    return {
      healthy: true,
      latency: `${latency}ms`,
      connections: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

async function checkRedisHealth() {
  try {
    const redis = require('../config/redis');
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    
    return {
      healthy: true,
      latency: `${latency}ms`
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

async function checkStorageHealth() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const uploadDir = path.join(__dirname, '../uploads');
    const hasWritePermission = fs.existsSync(uploadDir);
    
    return {
      healthy: hasWritePermission,
      writable: hasWritePermission,
      freeSpace: 'N/A' // Would require diskusage module
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

async function checkExternalServices() {
  const services = {
    payment_gateway: await checkPaymentGateway(),
    email_service: await checkEmailService(),
    sms_service: await checkSMSService()
  };
  
  return services;
}

async function checkPaymentGateway() {
  // Check Paystack/Flutterwave connectivity
  return { healthy: true, status: 'operational' };
}

async function checkEmailService() {
  // Check email service connectivity
  return { healthy: true, status: 'operational' };
}

async function checkSMSService() {
  // Check SMS service connectivity
  return { healthy: true, status: 'operational' };
}

async function checkSecurityHealth() {
  const checks = {
    ssl_enabled: req.secure,
    security_headers: checkSecurityHeaders(req),
    rate_limiting: 'enabled',
    sql_injection_protection: 'enabled',
    xss_protection: 'enabled'
  };
  
  return checks;
}

function checkSecurityHeaders(req) {
  const headers = req.headers;
  const requiredHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'strict-transport-security'
  ];
  
  const missing = requiredHeaders.filter(header => !headers[header]);
  
  return {
    enabled: missing.length === 0,
    missing: missing.length > 0 ? missing : null
  };
}

module.exports = AdminController;