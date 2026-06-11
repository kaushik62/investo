const User        = require('../models/User');
const Portfolio   = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const { getStockQuote }         = require('../services/stockService');
const { sendNotificationToUser } = require('../services/socketService');
const redis = require('../services/redisService');

// Invalidate caches that change after a trade
async function invalidateAfterTrade(userId) {
  await Promise.all([
    redis.del(redis.KEYS.portfolio(userId.toString())),
    redis.del(redis.KEYS.leaderboard),
    redis.del(redis.KEYS.allStocks),   // force fresh market data
  ]);
}

const buyStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const qty = parseInt(quantity, 10);
    if (!symbol || !qty || qty <= 0) {
      return res.status(400).json({ success: false, error: 'Valid symbol and quantity required' });
    }

    const user  = await User.findById(req.user._id);
    const quote = await getStockQuote(symbol.toUpperCase());
    if (!quote?.price) {
      return res.status(500).json({ success: false, error: 'Could not fetch stock price. Please try again.' });
    }

    const totalCost = parseFloat((quote.price * qty).toFixed(2));
    if (user.walletBalance < totalCost) {
      return res.status(400).json({ success: false, error: `Insufficient balance. Need ₹${totalCost.toLocaleString('en-IN')}, have ₹${user.walletBalance.toLocaleString('en-IN')}` });
    }

    // Atomic wallet deduction
    user.walletBalance = parseFloat((user.walletBalance - totalCost).toFixed(2));

    // Portfolio update
    let portfolio = await Portfolio.findOne({ userId: user._id });
    if (!portfolio) portfolio = await Portfolio.create({ userId: user._id, holdings: [] });

    const sym = symbol.toUpperCase();
    const existing = portfolio.holdings.find(h => h.symbol === sym);
    if (existing) {
      const newQty = existing.quantity + qty;
      existing.averageBuyPrice = parseFloat(((existing.averageBuyPrice * existing.quantity + quote.price * qty) / newQty).toFixed(2));
      existing.quantity        = newQty;
      existing.totalInvested   = parseFloat((existing.totalInvested + totalCost).toFixed(2));
      existing.lastUpdated     = new Date();
    } else {
      portfolio.holdings.push({
        symbol: sym, companyName: quote.name,
        quantity: qty, averageBuyPrice: quote.price,
        totalInvested: totalCost, lastUpdated: new Date(),
      });
    }
    portfolio.totalInvested = parseFloat((portfolio.totalInvested + totalCost).toFixed(2));

    // Push notification
    user.notifications.push({
      message: `Bought ${qty} shares of ${sym} @ ₹${quote.price.toFixed(2)}. Total: ₹${totalCost.toLocaleString('en-IN')}`,
      type: 'trade',
    });

    await Promise.all([user.save(), portfolio.save()]);

    const transaction = await Transaction.create({
      userId: user._id, symbol: sym, companyName: quote.name,
      quantity: qty, price: quote.price, totalAmount: totalCost,
      transactionType: 'BUY', status: 'completed',
    });

    await invalidateAfterTrade(user._id);

    sendNotificationToUser(user._id.toString(), {
      message: `✅ Bought ${qty} ${sym} @ ₹${quote.price.toFixed(2)}`,
      type: 'trade',
    });

    res.json({
      success: true,
      message: `Successfully bought ${qty} shares of ${sym}`,
      data: { transaction, walletBalance: user.walletBalance },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const sellStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const qty = parseInt(quantity, 10);
    if (!symbol || !qty || qty <= 0) {
      return res.status(400).json({ success: false, error: 'Valid symbol and quantity required' });
    }

    const sym = symbol.toUpperCase();
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    if (!portfolio) return res.status(400).json({ success: false, error: 'Portfolio not found' });

    const holding = portfolio.holdings.find(h => h.symbol === sym);
    if (!holding) return res.status(400).json({ success: false, error: `You don't own any ${sym} shares` });
    if (holding.quantity < qty) {
      return res.status(400).json({ success: false, error: `Insufficient shares. Owned: ${holding.quantity}, Requested: ${qty}` });
    }

    const quote        = await getStockQuote(sym);
    if (!quote?.price) {
      return res.status(500).json({ success: false, error: 'Could not fetch stock price. Please try again.' });
    }

    const totalRevenue = parseFloat((quote.price * qty).toFixed(2));
    const costBasis    = parseFloat((holding.averageBuyPrice * qty).toFixed(2));
    const profitLoss   = parseFloat((totalRevenue - costBasis).toFixed(2));

    const user = await User.findById(req.user._id);
    user.walletBalance = parseFloat((user.walletBalance + totalRevenue).toFixed(2));

    // Update holding
    holding.quantity      -= qty;
    holding.totalInvested  = parseFloat((holding.totalInvested - costBasis).toFixed(2));
    if (holding.quantity === 0) {
      portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== sym);
    }
    portfolio.totalInvested = parseFloat((portfolio.totalInvested - costBasis).toFixed(2));
    portfolio.realizedPL    = parseFloat(((portfolio.realizedPL || 0) + profitLoss).toFixed(2));

    user.notifications.push({
      message: `Sold ${qty} shares of ${sym} @ ₹${quote.price.toFixed(2)}. P&L: ${profitLoss >= 0 ? '+' : ''}₹${profitLoss.toFixed(2)}`,
      type: 'trade',
    });

    await Promise.all([user.save(), portfolio.save()]);

    const transaction = await Transaction.create({
      userId: user._id, symbol: sym, companyName: quote.name,
      quantity: qty, price: quote.price, totalAmount: totalRevenue,
      transactionType: 'SELL', profitLoss, status: 'completed',
    });

    await invalidateAfterTrade(user._id);

    sendNotificationToUser(user._id.toString(), {
      message: `${profitLoss >= 0 ? '📈' : '📉'} Sold ${qty} ${sym} @ ₹${quote.price.toFixed(2)} | P&L: ₹${profitLoss.toFixed(2)}`,
      type: 'trade',
    });

    res.json({
      success: true,
      message: `Successfully sold ${qty} shares of ${sym}`,
      data: { transaction, walletBalance: user.walletBalance, profitLoss },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { buyStock, sellStock };
