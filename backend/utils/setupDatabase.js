const mongoose = require('mongoose');

async function setupDatabase() {
  const User        = require('../models/User');
  const Portfolio   = require('../models/Portfolio');
  const Competition = require('../models/Competition');

  console.log('🔧 Running database setup…');

  // ── 1. Ensure indexes are created ────────────────────────
  await User.createIndexes();
  await Portfolio.createIndexes();
  await Competition.createIndexes();
  console.log('  ✅ Indexes ensured');

  // ── 2. Seed demo admin if no users exist ─────────────────
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@Investo.com',
      password: 'admin123456',          // hashed by pre-save hook
      role: 'admin',
      walletBalance: 1_000_000,
      watchlists: [{ name: 'My Watchlist', stocks: [] }],
    });
    await Portfolio.create({ userId: admin._id, holdings: [] });
    console.log('  ✅ Demo admin created  →  admin@Investo.com / admin123456');
  } else {
    console.log(`  ✅ Users collection already has ${userCount} document(s)`);
  }

  // ── 3. Seed active monthly competition if none exists ────
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const existing = await Competition.findOne({ month, year });

  if (!existing) {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    await Competition.create({
      name:      `Investo ${monthNames[month - 1]} ${year} Championship`,
      month,
      year,
      startDate: new Date(year, month - 1, 1),
      endDate:   new Date(year, month, 0, 23, 59, 59),
      status:    'active',
    });
    console.log(`  ✅ Monthly competition created for ${monthNames[month - 1]} ${year}`);
  } else {
    console.log('  ✅ Monthly competition already exists');
  }

  console.log('🎉 Database ready!\n');
}

module.exports = { setupDatabase };
