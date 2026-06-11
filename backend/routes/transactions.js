const express = require('express');
const { auth } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { type, symbol, page = 1, limit = 20 } = req.query;
    const query = { userId: req.user._id };
    if (type && type !== 'ALL') query.transactionType = type;
    if (symbol) query.symbol = symbol.toUpperCase();

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: transactions,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
