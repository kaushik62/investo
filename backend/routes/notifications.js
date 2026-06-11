const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const notifications = user.notifications.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/price-alert', auth, async (req, res) => {
  try {
    const { symbol, targetPrice, condition } = req.body;
    const user = await User.findById(req.user._id);
    user.priceAlerts.push({ symbol: symbol.toUpperCase(), targetPrice, condition, triggered: false });
    await user.save();
    res.json({ success: true, message: 'Price alert set successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
