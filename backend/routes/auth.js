const express = require('express');
const { body } = require('express-validator');
const { register, login, adminLogin, getProfile, updateProfile, changePassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], login);

// Dedicated admin login endpoint
router.post('/admin/login', adminLogin);

router.get('/me',                  auth, getProfile);
router.put('/profile',             auth, updateProfile);
router.put('/change-password',     auth, changePassword);

module.exports = router;
