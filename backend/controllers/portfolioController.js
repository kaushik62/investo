const Portfolio  = require('../models/Portfolio');
const User       = require('../models/User');
const { getAllStockQuotes } = require('../services/stockService');
const { getCachedStockData } = require('../services/socketService');
const redis      = require('../services/redisService');

const getPortfolio = async (req, res) => {
  try {
    const uid   = req.user._id.toString();
    const rKey  = redis.KEYS.portfolio(uid);

    // Try Redis cache first
    const cached = await redis.get(rKey);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) {
      return res.json({ success: true, data: { holdings:[], totalInvested:0, currentValue:0, unrealizedPL:0, realizedPL:0, totalPL:0, plPercent:0, walletBalance:0 } });
    }

    const liveStocks = getCachedStockData();
    const stocks     = liveStocks.length > 0 ? liveStocks : await getAllStockQuotes();
    const stockMap   = Object.fromEntries(stocks.map(s => [s.symbol, s]));

    const user = await User.findById(req.user._id);
    let currentValue = user.walletBalance;
    let totalInvested = 0;

    const holdings = portfolio.holdings.map(h => {
      // Match both NS and BSE symbol variants
      const stock       = stockMap[h.symbol] || stockMap[h.symbol.replace('.NS','.BSE')] || stockMap[h.symbol.replace('.BSE','.NS')];
      const currentPrice = stock ? stock.price : h.averageBuyPrice;
      const holdingValue = currentPrice * h.quantity;
      const invested     = h.averageBuyPrice * h.quantity;
      const pl           = holdingValue - invested;
      const plPercent    = invested > 0 ? parseFloat(((pl / invested) * 100).toFixed(2)) : 0;

      currentValue  += holdingValue;
      totalInvested += invested;

      return {
        symbol:        h.symbol,
        companyName:   h.companyName,
        quantity:      h.quantity,
        averageBuyPrice: h.averageBuyPrice,
        currentPrice,
        holdingValue:  parseFloat(holdingValue.toFixed(2)),
        invested:      parseFloat(invested.toFixed(2)),
        pl:            parseFloat(pl.toFixed(2)),
        plPercent,
        change:        stock?.change        ?? 0,
        changePercent: stock?.changePercent ?? 0,
      };
    });

    const unrealizedPL = holdings.reduce((s, h) => s + h.pl, 0);
    const plPercent    = totalInvested > 0 ? parseFloat(((unrealizedPL / totalInvested) * 100).toFixed(2)) : 0;

    const result = {
      holdings,
      totalInvested:  parseFloat(totalInvested.toFixed(2)),
      currentValue:   parseFloat(currentValue.toFixed(2)),
      walletBalance:  user.walletBalance,
      unrealizedPL:   parseFloat(unrealizedPL.toFixed(2)),
      realizedPL:     portfolio.realizedPL || 0,
      totalPL:        parseFloat((unrealizedPL + (portfolio.realizedPL || 0)).toFixed(2)),
      plPercent,
    };

    // Cache for 30s
    await redis.set(rKey, result, redis.TTL.portfolio);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getPortfolio };
