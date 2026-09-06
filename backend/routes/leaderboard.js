const express    = require('express');
const { auth }   = require('../middleware/auth');
const Portfolio  = require('../models/Portfolio');
const User       = require('../models/User');
const Competition = require('../models/Competition');
const { getCachedStockData } = require('../services/socketService');
const { getAllStockQuotes }   = require('../services/stockService');
const redis = require('../services/redisService');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    // Try Redis cache
    const cached = await redis.get(redis.KEYS.leaderboard);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const liveStocks = getCachedStockData();
    const stocks     = liveStocks.length > 0 ? liveStocks : await getAllStockQuotes();
    const stockMap   = Object.fromEntries(stocks.map(s => [s.symbol, s.price]));

    const portfolios = await Portfolio.find().populate('userId', 'name email avatar');
    const rankings = [];

    for (const portfolio of portfolios) {
      if (!portfolio.userId) continue;
      const user = await User.findById(portfolio.userId._id);
      if (!user) continue;

      let holdingsValue = 0;
      portfolio.holdings.forEach(h => {
        const price = stockMap[h.symbol]
          ?? stockMap[h.symbol.replace('.NS','.BSE')]
          ?? stockMap[h.symbol.replace('.BSE','.NS')]
          ?? h.averageBuyPrice;
        holdingsValue += h.quantity * price;
      });

      const totalValue   = parseFloat((user.walletBalance + holdingsValue).toFixed(2));
      const returnPct    = parseFloat((((totalValue - 1_000_000) / 1_000_000) * 100).toFixed(2));

      rankings.push({
        userId:           portfolio.userId._id,
        name:             portfolio.userId.name,
        email:            portfolio.userId.email,
        avatar:           portfolio.userId.avatar,
        portfolioValue:   totalValue,
        walletBalance:    user.walletBalance,
        holdingsValue:    parseFloat(holdingsValue.toFixed(2)),
        returnPercentage: returnPct,
      });
    }

    rankings.sort((a, b) => b.returnPercentage - a.returnPercentage);
    const leaderboard = rankings.map((r, i) => ({ ...r, rank: i + 1 }));

    await redis.set(redis.KEYS.leaderboard, leaderboard, redis.TTL.leaderboard);

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/competition', auth, async (req, res) => {
  try {
    const competition = await Competition.findOne({ status: 'active' })
      .populate('participants.userId', 'name avatar email');
    res.json({ success: true, data: competition });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
