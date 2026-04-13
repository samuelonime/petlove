const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    console.log('Authorization header:', authHeader);
    
    const token = authHeader?.replace('Bearer ', '');
    console.log('Extracted token:', token ? `${token.substring(0, 20)}...` : 'null');
    
    if (!token) {
      console.warn('No token provided');
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully, user ID:', decoded.id);
    
    const user = await User.findById(decoded.id);
    console.log('User found from DB:', user?.email);

    if (!user) {
      console.warn('User not found in DB for ID:', decoded.id);
      throw new Error('User not found');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

const isSeller = (req, res, next) => {
  if (req.user.user_type !== 'seller' && req.user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Seller privileges required.' });
  }
  next();
};

const isBuyer = (req, res, next) => {
  if (req.user.user_type !== 'buyer' && req.user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Buyer privileges required.' });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

module.exports = { auth, isSeller, isBuyer, isAdmin };