const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new Error();
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
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