const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  avatar: {
    type: String,
    default: ''
  },
  walletBalance: {
    type: Number,
    default: 1000000,
    min: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: { type: String, enum: ['active', 'inactive', 'canceled'], default: 'inactive' },
    currentPeriodEnd: Date
  },
  watchlists: [{
    name: { type: String, default: 'My Watchlist' },
    stocks: [String]
  }],
  priceAlerts: [{
    symbol: String,
    targetPrice: Number,
    condition: { type: String, enum: ['above', 'below'] },
    triggered: { type: Boolean, default: false }
  }],
  notifications: [{
    message: String,
    type: { type: String, enum: ['trade', 'alert', 'competition', 'subscription', 'system'] },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
