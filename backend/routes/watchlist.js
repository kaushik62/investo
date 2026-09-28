const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user.watchlists });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:watchlistId/stocks', auth, async (req, res) => {
  try {
    const { symbol } = req.body;
    const user = await User.findById(req.user._id);
    const watchlist = user.watchlists.id(req.params.watchlistId);
    if (!watchlist) return res.status(404).json({ success: false, error: 'Watchlist not found' });
    if (watchlist.stocks.includes(symbol.toUpperCase())) {
      return res.status(400).json({ success: false, error: 'Stock already in watchlist' });
    }
    watchlist.stocks.push(symbol.toUpperCase());
    await user.save();
    res.json({ success: true, data: watchlist });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user._id);
    user.watchlists.push({ name: name || 'New Watchlist', stocks: [] });
    await user.save();
    res.json({ success: true, data: user.watchlists });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
