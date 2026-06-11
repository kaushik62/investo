const cron = require('node-cron');
const { broadcastMarketUpdate } = require('./socketService');
const Competition = require('../models/Competition');

const startMarketCronJob = (io) => {
  cron.schedule('*/60 * * * * *', async () => {
    await broadcastMarketUpdate();
  });

  // Update competition rankings every hour
  cron.schedule('0 * * * *', async () => {
    await updateCompetitionRankings();
  });
 
  cron.schedule('0 0 1 * *', async () => {
    await createMonthlyCompetition();
  });

  console.log('⏰ Cron jobs started:');
  console.log('   📊 Market broadcast: every 60s (Alpha Vantage safe rate)');
  console.log('   🏆 Competition rankings: every hour');

  // Initial broadcast after 3s
  setTimeout(() => broadcastMarketUpdate(), 3000);
};

const updateCompetitionRankings = async () => {
  try {
    const { getAllStockQuotes } = require('./stockService');
    const Portfolio = require('../models/Portfolio');
    const User = require('../models/User');

    const activeComp = await Competition.findOne({ status: 'active' });
    if (!activeComp) return;

    const stocks = await getAllStockQuotes();
    const stockMap = {};
    stocks.forEach(s => { stockMap[s.symbol] = s.price; });

    const portfolios = await Portfolio.find();
    const rankings = [];

    for (const portfolio of portfolios) {
      const user = await User.findById(portfolio.userId);
      if (!user) continue;
      let currentValue = user.walletBalance;
      portfolio.holdings.forEach(h => {
        const price = stockMap[h.symbol] || stockMap[h.symbol?.replace('.NS', '.BSE')] || h.averageBuyPrice;
        currentValue += h.quantity * price;
      });
      const returnPct = ((currentValue - 1_000_000) / 1_000_000) * 100;
      rankings.push({ userId: portfolio.userId, portfolioValue: currentValue, returnPercentage: returnPct });
    }

    rankings.sort((a, b) => b.returnPercentage - a.returnPercentage);
    activeComp.participants = rankings.map((r, i) => ({
      userId: r.userId, portfolioValueAtStart: 1_000_000,
      portfolioValueAtEnd: r.portfolioValue, returnPercentage: r.returnPercentage, rank: i + 1,
    }));
    await activeComp.save();
  } catch (error) {
    console.error('Error updating competition rankings:', error.message);
  }
};

const createMonthlyCompetition = async () => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const existing = await Competition.findOne({ month, year });
    if (existing) return;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    await Competition.create({
      name: `Investo ${monthNames[month - 1]} ${year} Championship`,
      month, year,
      startDate: new Date(year, month - 1, 1),
      endDate:   new Date(year, month, 0, 23, 59, 59),
      status: 'active',
    });
    console.log(`🏆 Competition created: ${monthNames[month - 1]} ${year}`);
  } catch (error) {
    console.error('Error creating monthly competition:', error.message);
  }
};

module.exports = { startMarketCronJob, updateCompetitionRankings };
