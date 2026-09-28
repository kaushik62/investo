const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const header = req.header('Authorization') || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : header;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Your account has been blocked. Contact admin.' });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired. Please login again.' });
    }
    res.status(401).json({ success: false, error: 'Invalid token.' });
  }
};

const adminAuth = async (req, res, next) => {
  // Run normal auth first, then check role
  auth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }
    next();
  });
};

module.exports = { auth, adminAuth };
