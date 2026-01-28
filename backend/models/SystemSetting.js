const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'array', 'object'],
    required: true
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'general',
      'payment',
      'shipping',
      'commission',
      'security',
      'email',
      'sms',
      'notifications',
      'appearance',
      'seo',
      'social',
      'maintenance'
    ],
    default: 'general'
  },
  
  displayName: {
    type: String,
    required: true
  },
  
  description: String,
  
  validationRules: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Access control
  isPublic: {
    type: Boolean,
    default: false
  },
  
  isEditable: {
    type: Boolean,
    default: true
  },
  
  requiresRestart: {
    type: Boolean,
    default: false
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // History
  history: [{
    value: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  
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
systemSettingSchema.index({ category: 1 });
systemSettingSchema.index({ isPublic: 1 });
systemSettingSchema.index({ updatedAt: -1 });

// Methods
systemSettingSchema.methods.addToHistory = function(adminId, reason) {
  this.history.push({
    value: this.value,
    changedBy: adminId,
    changedAt: new Date(),
    reason
  });
  
  // Keep only last 10 changes
  if (this.history.length > 10) {
    this.history = this.history.slice(-10);
  }
  
  return this.save();
};

systemSettingSchema.methods.validateValue = function(newValue) {
  const rules = this.validationRules;
  
  if (!rules) return true;
  
  if (rules.required && (newValue === undefined || newValue === null || newValue === '')) {
    throw new Error('Value is required');
  }
  
  if (rules.min !== undefined && newValue < rules.min) {
    throw new Error(`Value must be at least ${rules.min}`);
  }
  
  if (rules.max !== undefined && newValue > rules.max) {
    throw new Error(`Value must be at most ${rules.max}`);
  }
  
  if (rules.minLength && newValue.length < rules.minLength) {
    throw new Error(`Value must be at least ${rules.minLength} characters`);
  }
  
  if (rules.maxLength && newValue.length > rules.maxLength) {
    throw new Error(`Value must be at most ${rules.maxLength} characters`);
  }
  
  if (rules.pattern && !new RegExp(rules.pattern).test(newValue)) {
    throw new Error('Value does not match required pattern');
  }
  
  if (rules.enum && !rules.enum.includes(newValue)) {
    throw new Error(`Value must be one of: ${rules.enum.join(', ')}`);
  }
  
  return true;
};

// Statics
systemSettingSchema.statics.getByKey = function(key) {
  return this.findOne({ key });
};

systemSettingSchema.statics.getByCategory = function(category) {
  return this.find({ category });
};

systemSettingSchema.statics.getPublicSettings = function() {
  return this.find({ isPublic: true });
};

systemSettingSchema.statics.initializeDefaults = async function() {
  const defaults = [
    {
      key: 'SITE_NAME',
      value: 'PetHub',
      dataType: 'string',
      category: 'general',
      displayName: 'Site Name',
      description: 'The name of your website',
      isPublic: true,
      validationRules: {
        required: true,
        minLength: 2,
        maxLength: 100
      }
    },
    {
      key: 'SITE_URL',
      value: 'https://pethub.ng',
      dataType: 'string',
      category: 'general',
      displayName: 'Site URL',
      description: 'The URL of your website',
      isPublic: true,
      validationRules: {
        required: true,
        pattern: '^https?://.+'
      }
    },
    {
      key: 'COMMISSION_RATE',
      value: 10,
      dataType: 'number',
      category: 'commission',
      displayName: 'Commission Rate',
      description: 'Percentage commission charged on each order',
      validationRules: {
        required: true,
        min: 0,
        max: 50
      }
    },
    {
      key: 'ESCROW_RELEASE_DAYS',
      value: 7,
      dataType: 'number',
      category: 'payment',
      displayName: 'Escrow Release Days',
      description: 'Number of days after delivery to auto-release escrow',
      validationRules: {
        required: true,
        min: 1,
        max: 30
      }
    },
    {
      key: 'MIN_ORDER_AMOUNT',
      value: 1000,
      dataType: 'number',
      category: 'general',
      displayName: 'Minimum Order Amount',
      description: 'Minimum amount required to place an order',
      validationRules: {
        required: true,
        min: 0
      }
    },
    {
      key: 'FREE_SHIPPING_THRESHOLD',
      value: 5000,
      dataType: 'number',
      category: 'shipping',
      displayName: 'Free Shipping Threshold',
      description: 'Order amount required for free shipping',
      isPublic: true,
      validationRules: {
        min: 0
      }
    },
    {
      key: 'MAINTENANCE_MODE',
      value: false,
      dataType: 'boolean',
      category: 'maintenance',
      displayName: 'Maintenance Mode',
      description: 'Enable maintenance mode',
      requiresRestart: false
    }
  ];
  
  for (const defaultSetting of defaults) {
    const existing = await this.findOne({ key: defaultSetting.key });
    if (!existing) {
      await this.create(defaultSetting);
    }
  }
};

module.exports = mongoose.model('SystemSetting', systemSettingSchema);