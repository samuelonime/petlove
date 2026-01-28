const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  
  password: {
    type: String,
    required: true,
    minlength: 12,
    select: false
  },
  
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Contact Information
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\+?[\d\s\-\(\)]+$/.test(v);
      },
      message: 'Please provide a valid phone number'
    }
  },
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['admin', 'super_admin', 'moderator'],
    default: 'admin'
  },
  
  permissions: [{
    type: String,
    enum: [
      // User Management
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      
      // Product Management
      'products:read',
      'products:create',
      'products:update',
      'products:delete',
      
      // Order Management
      'orders:read',
      'orders:update',
      'orders:cancel',
      
      // Financial Management
      'payments:read',
      'transactions:read',
      'escrow:read',
      'escrow:release',
      
      // Seller Management
      'sellers:read',
      'sellers:verify',
      'sellers:update',
      'sellers:suspend',
      
      // Dispute Management
      'disputes:read',
      'disputes:resolve',
      
      // Analytics & Reports
      'analytics:read',
      'reports:generate',
      
      // System Settings
      'settings:read',
      'settings:update',
      
      // Security & Audit
      'security:read',
      'audit:read',
      
      // Admin Management
      'admins:read',
      'admins:create',
      'admins:update',
      'admins:delete',
      
      // Content Management
      'content:read',
      'content:create',
      'content:update',
      'content:delete'
    ]
  }],
  
  // Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorBackupCodes: [{
    type: String,
    select: false
  }],
  
  // Security Settings
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Activity Tracking
  lastActivity: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ createdAt: -1 });
adminSchema.index({ 'permissions': 1 });

// Virtuals
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Set password changed timestamp
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

adminSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Methods
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

adminSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

adminSchema.methods.incrementLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account if we've reached max attempts
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutes
  }
  
  return await this.updateOne(updates);
};

adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

adminSchema.methods.generate2FASecret = function() {
  const secret = speakeasy.generateSecret({
    name: `PetHub (${this.email})`
  });
  
  this.twoFactorSecret = secret.base32;
  return secret;
};

adminSchema.methods.verify2FAToken = function(token) {
  return speakeasy.totp.verify({
    secret: this.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 1 // Allow 30 seconds before/after
  });
};

adminSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  
  // Hash codes before storing
  this.twoFactorBackupCodes = codes.map(code => 
    crypto.createHash('sha256').update(code).digest('hex')
  );
  
  return codes;
};

adminSchema.methods.verifyBackupCode = function(code) {
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  const index = this.twoFactorBackupCodes.indexOf(hashedCode);
  
  if (index !== -1) {
    // Remove used backup code
    this.twoFactorBackupCodes.splice(index, 1);
    return true;
  }
  
  return false;
};

// Statics
adminSchema.statics.findByEmail = function(email) {
  return this.findOne({ email }).select('+password +twoFactorSecret');
};

adminSchema.statics.getAdminsWithPermissions = function(permission) {
  return this.find({
    isActive: true,
    permissions: permission
  });
};

adminSchema.statics.getAdminStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        role: '$_id',
        count: 1,
        active: 1,
        inactive: { $subtract: ['$count', '$active'] }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('Admin', adminSchema);