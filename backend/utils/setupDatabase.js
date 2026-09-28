const mongoose = require('mongoose');

async function setupDatabase() {
  const User        = require('../models/User');
  const Portfolio   = require('../models/Portfolio');
  const Transaction = require('../models/Transaction');

  console.log('🔧 Running database setup…');

  // ── 1. Clean duplicate portfolios if any exist ───────────
  try {
    const allPortfolios = await Portfolio.find().sort({ updatedAt: -1 });
    const seenUsers = new Map();
    for (const p of allPortfolios) {
      if (!p.userId) {
        await Portfolio.deleteOne({ _id: p._id });
        continue;
      }
      const uid = p.userId.toString();
      if (!seenUsers.has(uid)) {
        seenUsers.set(uid, p);
      } else {
        const existing = seenUsers.get(uid);
        // Keep the one with holdings if existing has none
        if ((!existing.holdings || existing.holdings.length === 0) && (p.holdings && p.holdings.length > 0)) {
          await Portfolio.deleteOne({ _id: existing._id });
          seenUsers.set(uid, p);
        } else {
          await Portfolio.deleteOne({ _id: p._id });
        }
      }
    }
  } catch (err) {
    console.warn('⚠️  Warning during portfolio cleanup:', err.message);
  }

  // ── 2. Ensure indexes are created safely ─────────────────
  try {
    await User.createIndexes();
    await Portfolio.createIndexes();
    await Transaction.createIndexes();
    console.log('  ✅ Indexes ensured');
  } catch (err) {
    console.warn('  ⚠️  Index warning:', err.message);
  }

  console.log('🎉 Database ready!\n');
}

module.exports = { setupDatabase };
