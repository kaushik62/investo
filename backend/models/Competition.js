const mongoose = require('mongoose');

const competitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    portfolioValueAtStart: Number,
    portfolioValueAtEnd: Number,
    returnPercentage: Number,
    rank: Number
  }],
  winners: [{
    rank: Number,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    returnPercentage: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Competition', competitionSchema);
