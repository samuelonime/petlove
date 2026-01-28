const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  // Admin who performed the action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  
  // Action performed
  action: {
    type: String,
    required: true,
    enum: [
      // User Management
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'USER_SUSPEND',
      'USER_ACTIVATE',
      
      // Seller Management
      'SELLER_VERIFY',
      'SELLER_SUSPEND',
      'SELLER_ACTIVATE',
      'SELLER_UPDATE',
      
      // Product Management
      'PRODUCT_APPROVE',
      'PRODUCT_REJECT',
      'PRODUCT_UPDATE',
      'PRODUCT_DELETE',
      
      // Order Management
      'ORDER_UPDATE_STATUS',
      'ORDER_CANCEL',
      'ORDER_REFUND',
      'ORDER_ESCROW_RELEASE',
      
      // Financial Management
      'PAYMENT_REFUND',
      'ESCROW_RELEASE',
      'COMMISSION_ADJUST',
      
      // Dispute Management
      'DISPUTE_ASSIGN',
      'DISPUTE_RESOLVE',
      'DISPUTE_ESCALATE',
      
      // System Settings
      'SETTING_UPDATE',
      'SETTING_BACKUP',
      'SETTING_RESTORE',
      
      // Admin Management
      'ADMIN_CREATE',
      'ADMIN_UPDATE',
      'ADMIN_DELETE',
      'ADMIN_PERMISSION_UPDATE',
      
      // Security
      'IP_BLOCK',
      'IP_UNBLOCK',
      'SECURITY_ALERT',
      
      // System Maintenance
      'SYSTEM_BACKUP',
      'SYSTEM_CLEANUP',
      'DATABASE_OPTIMIZE',
      
      // Authentication
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'PASSWORD_CHANGE',
      '2FA_ENABLE',
      '2FA_DISABLE',
      
      // General
      'REPORT_GENERATE',
      'NOTIFICATION_SEND',
      'BROADCAST_SEND'
    ]
  },
  
  // Entity that was affected
  entityType: {
    type: String,
    enum: ['user', 'seller', 'product', 'order', 'payment', 'dispute', 'admin', 'system', 'security', 'settings']
  },
  
  // Entity ID that was affected
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  
  // Details about the action
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // IP Address
  ipAddress: {
    type: String,
    required: true
  },
  
  // User Agent
  userAgent: String,
  
  // Location data
  location: {
    country: String,
    city: String,
    region: String,
    latitude: Number,
    longitude: Number
  },
  
  // Status of the action
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  
  // Error message if failed
  errorMessage: String,
  
  // Performance metrics
  responseTime: Number, // in milliseconds
  
  // Severity level
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: '90d' // Auto-delete after 90 days
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries
adminLogSchema.index({ entityType: 1, entityId: 1 });
adminLogSchema.index({ ipAddress: 1, createdAt: -1 });

// Virtuals
adminLogSchema.virtual('admin', {
  ref: 'Admin',
  localField: 'adminId',
  foreignField: '_id',
  justOne: true
});

// Methods
adminLogSchema.methods.getFormattedDetails = function() {
  return JSON.stringify(this.details, null, 2);
};

adminLogSchema.methods.isSensitiveAction = function() {
  const sensitiveActions = [
    'USER_DELETE',
    'ADMIN_CREATE',
    'ADMIN_DELETE',
    'SETTING_UPDATE',
    'ORDER_ESCROW_RELEASE',
    'PAYMENT_REFUND',
    'IP_BLOCK',
    'SYSTEM_BACKUP'
  ];
  
  return sensitiveActions.includes(this.action);
};

// Statics
adminLogSchema.statics.logAction = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log admin action:', error);
    return null;
  }
};

adminLogSchema.statics.getAdminActivity = async function(adminId, limit = 50) {
  return this.find({ adminId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('admin', 'email firstName lastName');
};

adminLogSchema.statics.getRecentSensitiveActions = async function(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return this.find({
    createdAt: { $gte: date },
    severity: { $in: ['high', 'critical'] }
  })
  .sort({ createdAt: -1 })
  .populate('admin', 'email firstName lastName');
};

adminLogSchema.statics.getStats = async function(timeRange = '24h') {
  const ranges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  const cutoff = new Date(Date.now() - (ranges[timeRange] || ranges['24h']));
  
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: cutoff }
      }
    },
    {
      $facet: {
        totalActions: [{ $count: 'count' }],
        byAction: [
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        byAdmin: [
          { $group: { _id: '$adminId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        bySeverity: [
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        averageResponseTime: [
          { 
            $group: { 
              _id: null, 
              avg: { $avg: '$responseTime' },
              min: { $min: '$responseTime' },
              max: { $max: '$responseTime' }
            } 
          }
        ]
      }
    }
  ]);
  
  return stats[0];
};

module.exports = mongoose.model('AdminLog', adminLogSchema);