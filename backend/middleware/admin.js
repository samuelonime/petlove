const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Admin Authentication Middleware
 * Verifies if user is an admin with valid token
 */
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid token. User not found.',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if user is admin
    if (user.user_type !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.',
        code: 'ADMIN_REQUIRED'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

const superAdminOnly = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Super admin privileges required.' });
  }
  next();
};

const auditTrail = (req, res, next) => {
  // Log admin actions (implement as needed)
  console.log(`[ADMIN AUDIT] ${req.method} ${req.path} by ${req.user?.id}`);
  next();
};

const adminLimiter = (req, res, next) => {
  // Rate limiting for admin (implement as needed)
  next();
};

const ipWhitelist = (allowedIps = []) => {
  return (req, res, next) => {
    if (allowedIps && allowedIps.length > 0) {
      const clientIp = req.ip;
      if (!allowedIps.includes(clientIp)) {
        return res.status(403).json({ error: 'IP not whitelisted' });
      }
    }
    next();
  };
};

const require2FA = (req, res, next) => {
  // Check for 2FA (implement as needed)
  next();
};

const validateAdminSession = (req, res, next) => {
  // Validate admin session (implement as needed)
  next();
};

module.exports = {
  adminAuth,
  superAdminOnly,
  auditTrail,
  adminLimiter,
  ipWhitelist,
  require2FA,
  validateAdminSession
};