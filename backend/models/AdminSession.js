const mongoose = require('mongoose');
const crypto = require('crypto');

const adminSessionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(16).toString('hex')
  },
  
  // Authentication tokens
  accessTokenHash: {
    type: String,
    required: true
  },
  
  refreshTokenHash: {
    type: String,
    required: true
  },
  
  // Device information
  userAgent: String,
  browser: String,
  browserVersion: String,
  os: String,
  osVersion: String,
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  
  // Location
  ipAddress: String,
  country: String,
  city: String,
  region: String,
  
  // Two-factor authentication
  twoFactorVerified: {
    type: Boolean,
    default: false
  },
  
  twoFactorMethod: {
    type: String,
    enum: ['authenticator', 'sms', 'email', 'backup_code'],
    default: 'authenticator'
  },
  
  // Security flags
  isCompromised: {
    type: Boolean,
    default: false
  },
  
  compromisedReason: String,
  
  // Activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  loginTime: {
    type: Date,
    default: Date.now
  },
  
  // Session expiry
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // Session status
  isActive: {
    type: Boolean,
    default: true
  },
  
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  revokedReason: String,
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
adminSessionSchema.index({ adminId: 1, isActive: 1 });
adminSessionSchema.index({ accessTokenHash: 1 });
adminSessionSchema.index({ refreshTokenHash: 1 });
adminSessionSchema.index({ lastActivity: -1 });
adminSessionSchema.index({ ipAddress: 1 });

// Methods
adminSessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

adminSessionSchema.methods.revoke = function(revokedBy = null, reason = 'Manual revocation') {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokedReason = reason;
  return this.save();
};

adminSessionSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

adminSessionSchema.methods.markAsCompromised = function(reason) {
  this.isCompromised = true;
  this.compromisedReason = reason;
  this.isActive = false;
  return this.save();
};

// Statics
adminSessionSchema.statics.createSession = async function(adminId, sessionData) {
  const session = new this({
    adminId,
    ...sessionData,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });
  
  return await session.save();
};

adminSessionSchema.statics.findByTokenHash = function(tokenHash) {
  return this.findOne({
    $or: [
      { accessTokenHash: tokenHash },
      { refreshTokenHash: tokenHash }
    ],
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

adminSessionSchema.statics.getActiveSessions = function(adminId) {
  return this.find({
    adminId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

adminSessionSchema.statics.revokeAllSessions = function(adminId, revokedBy = null, reason = 'Security policy') {
  return this.updateMany(
    { adminId, isActive: true },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason
      }
    }
  );
};

adminSessionSchema.statics.revokeSession = function(sessionId, revokedBy = null, reason = 'Manual revocation') {
  return this.findOneAndUpdate(
    { sessionId, isActive: true },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason
      }
    },
    { new: true }
  );
};

adminSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('AdminSession', adminSessionSchema);