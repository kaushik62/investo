const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Get watchlists
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user.watchlists });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add stock to watchlist
router.post('/:watchlistId/stocks', auth, async (req, res) => {
  try {
    const { symbol } = req.body;
    const user = await User.findById(req.user._id);
    const watchlist = user.watchlists.id(req.params.watchlistId);
    if (!watchlist) return res.status(404).json({ success: false, error: 'Watchlist not found' });

    if (watchlist.stocks.includes(symbol.toUpperCase())) {
      return res.status(400).json({ success: false, error: 'Stock already in watchlist' });
    }

    // Check watchlist limit for free users
    if (user.subscription?.plan !== 'premium' && user.watchlists.length >= 1 && watchlist.stocks.length >= 10) {
      return res.status(403).json({ success: false, error: 'Free plan limited to 10 stocks per watchlist. Upgrade to Premium for unlimited.' });
    }

    watchlist.stocks.push(symbol.toUpperCase());
    await user.save();
    res.json({ success: true, data: watchlist });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove stock from watchlist
router.delete('/:watchlistId/stocks/:symbol', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const watchlist = user.watchlists.id(req.params.watchlistId);
    if (!watchlist) return res.status(404).json({ success: false, error: 'Watchlist not found' });
    watchlist.stocks = watchlist.stocks.filter(s => s !== req.params.symbol.toUpperCase());
    await user.save();
    res.json({ success: true, data: watchlist });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new watchlist (premium only after first)
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user._id);
    if (user.watchlists.length >= 1 && user.subscription?.plan !== 'premium') {
      return res.status(403).json({ success: false, error: 'Premium subscription required for multiple watchlists' });
    }
    user.watchlists.push({ name: name || 'New Watchlist', stocks: [] });
    await user.save();
    res.json({ success: true, data: user.watchlists });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
