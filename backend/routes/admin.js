const express    = require('express');
const { adminAuth } = require('../middleware/auth');
const User        = require('../models/User');
const Transaction = require('../models/Transaction');
const Portfolio   = require('../models/Portfolio');
const Competition = require('../models/Competition');
const router      = express.Router();
const redis       = require('../services/redisService');

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  // Try Redis cache first
  try {
    const cached = await redis.get(redis.KEYS.adminStats);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });
  } catch { /* proceed without cache */ }

  try {
    const [totalUsers, totalTrades, activeSubscriptions, competitions] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      User.countDocuments({ 'subscription.plan': 'premium', 'subscription.status': 'active' }),
      Competition.find({ status: { $in: ['active', 'completed'] } }).sort({ createdAt: -1 }).limit(6),
    ]);

    const recentTrades = await Transaction.aggregate([
      { $group: {
          _id:    { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count:  { $sum: 1 },
          volume: { $sum: '$totalAmount' },
      }},
      { $sort: { _id: -1 } },
      { $limit: 7 },
    ]);

    // Revenue (premium subs × ₹999)
    const revenue = activeSubscriptions * 999;

    // New users today
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: todayStart } });

    // Trades today
    const tradesToday = await Transaction.countDocuments({ createdAt: { $gte: todayStart } });

    // Top traded symbols
    const topSymbols = await Transaction.aggregate([
      { $group: { _id: '$symbol', count: { $sum: 1 }, volume: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const statsData = { totalUsers, totalTrades, activeSubscriptions, revenue, newUsersToday, tradesToday, competitions, recentTrades, topSymbols };
    try { await redis.set(redis.KEYS.adminStats, statsData, redis.TTL.adminStats); } catch {}
    res.json({
      success: true,
      data: statsData,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, plan } = req.query;
    const query = {};
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    if (role)   query.role = role;
    if (plan)   query['subscription.plan'] = plan;

    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(parseInt(limit)),
      User.countDocuments(query),
    ]);
    res.json({ success: true, data: users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/admin/users/:id ──────────────────────────────────
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const [portfolio, transactions] = await Promise.all([
      Portfolio.findOne({ userId: user._id }),
      Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({ success: true, data: { user, portfolio, recentTransactions: transactions } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/admin/users/:id/toggle ──────────────────────────
// Block / unblock user
router.put('/users/:id/toggle', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot block yourself' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: user, message: `User ${user.isActive ? 'unblocked' : 'blocked'} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/admin/users/:id/role ─────────────────────────────
// Promote / demote admin
router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ success: false, error: 'Invalid role' });
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot change your own role' });

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user, message: `Role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/admin/users/:id/wallet ──────────────────────────
// Adjust wallet balance
router.put('/users/:id/wallet', adminAuth, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || isNaN(amount))
      return res.status(400).json({ success: false, error: 'Valid amount required' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const oldBalance = user.walletBalance;
    user.walletBalance = Math.max(0, user.walletBalance + parseFloat(amount));
    user.notifications.push({
      message: `Admin adjusted your wallet by ₹${parseFloat(amount).toLocaleString('en-IN')}. ${reason || ''}`,
      type: 'system',
    });
    await user.save();

    res.json({
      success: true,
      data: user,
      message: `Wallet adjusted from ₹${oldBalance.toLocaleString('en-IN')} to ₹${user.walletBalance.toLocaleString('en-IN')}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────
// Delete user and all their data
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });

    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Portfolio.findOneAndDelete({ userId: req.params.id }),
      Transaction.deleteMany({ userId: req.params.id }),
    ]);
    res.json({ success: true, message: 'User and all data deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/admin/broadcast ─────────────────────────────────
// Send notification to all users
router.post('/broadcast', adminAuth, async (req, res) => {
  try {
    const { message, type = 'system' } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });

    const users = await User.find({ isActive: true });
    const notification = { message, type, read: false, createdAt: new Date() };

    await User.updateMany({ isActive: true }, { $push: { notifications: notification } });

    // Emit via socket to all connected users
    if (req.io) req.io.emit('notification', { message, type });

    res.json({ success: true, message: `Broadcast sent to ${users.length} users` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/admin/transactions ───────────────────────────────
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, symbol, type } = req.query;
    const query = {};
    if (symbol) query.symbol = symbol.toUpperCase();
    if (type && type !== 'ALL') query.transactionType = type;

    const [transactions, total] = await Promise.all([
      Transaction.find(query).populate('userId', 'name email')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      Transaction.countDocuments(query),
    ]);
    res.json({ success: true, data: transactions, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/admin/competition ───────────────────────────────
// Manually create competition
router.post('/competition', adminAuth, async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    const comp = await Competition.create({ name, startDate, endDate, status: 'active', month: new Date(startDate).getMonth() + 1, year: new Date(startDate).getFullYear() });
    res.json({ success: true, data: comp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/admin/competition/:id ────────────────────────────
router.put('/competition/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const comp = await Competition.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, data: comp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

// Invalidate admin stats cache on user changes
const invalidateAdminCache = async () => {
  const redis = require('../services/redisService');
  await redis.del(redis.KEYS.adminStats);
  await redis.del(redis.KEYS.leaderboard);
};
