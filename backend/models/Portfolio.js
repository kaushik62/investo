const mongoose = require('mongoose');

const portfolioItemSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true },
  companyName: String,
  quantity: { type: Number, required: true, min: 0 },
  averageBuyPrice: { type: Number, required: true },
  totalInvested: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  holdings: [portfolioItemSchema],
  totalInvested: { type: Number, default: 0 },
  realizedPL: { type: Number, default: 0 }
}, { timestamps: true });

portfolioSchema.methods.getHolding = function(symbol) {
  return this.holdings.find(h => h.symbol === symbol.toUpperCase());
};

module.exports = mongoose.model('Portfolio', portfolioSchema);
