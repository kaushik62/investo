const { getAllStockQuotes, getNifty50Quote } = require('./stockService');
const redis = require('./redisService');

let io;
let connectedUsers  = new Map();
let cachedStockData = [];

const initializeSocketService = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    // Send cached data immediately on connect
    if (cachedStockData.length > 0) {
      socket.emit('market-update', cachedStockData);
    }

    socket.on('authenticate', (userId) => {
      connectedUsers.set(socket.id, userId);
      socket.join(`user_${userId}`);
    });

    socket.on('subscribe-stock',   (sym) => socket.join(`stock_${sym}`));
    socket.on('unsubscribe-stock', (sym) => socket.leave(`stock_${sym}`));

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
    });
  });
};

const broadcastMarketUpdate = async () => {
  if (!io) return;
  try {
    const [stockData, niftyData] = await Promise.all([
      getAllStockQuotes(),
      getNifty50Quote(),
    ]);

    cachedStockData = stockData;

    // Broadcast to all connected clients
    io.emit('market-update', stockData);
    io.emit('nifty-update',  niftyData);

    // Per-stock room updates
    stockData.forEach(stock => {
      io.to(`stock_${stock.symbol}`).emit('stock-update', stock);
    });

    // Check price alerts (non-blocking)
    checkPriceAlerts(stockData).catch(() => {});
  } catch (error) {
    console.error('broadcastMarketUpdate error:', error.message);
  }
};

const checkPriceAlerts = async (stockData) => {
  const User = require('../models/User');
  const users = await User.find({ 'priceAlerts.triggered': false }).select('priceAlerts notifications');

  const updates = [];
  for (const user of users) {
    let changed = false;
    for (const alert of user.priceAlerts) {
      if (alert.triggered) continue;
      const stock = stockData.find(s => s.symbol === alert.symbol || s.avSymbol === alert.symbol);
      if (!stock) continue;

      const hit = (alert.condition === 'above' && stock.price >= alert.targetPrice)
               || (alert.condition === 'below' && stock.price <= alert.targetPrice);

      if (hit) {
        alert.triggered = true;
        changed = true;
        const msg = `🔔 Price Alert: ${alert.symbol.replace('.BSE','').replace('.NS','')} ${alert.condition === 'above' ? '📈 crossed above' : '📉 fell below'} ₹${alert.targetPrice}. Current: ₹${stock.price.toFixed(2)}`;
        user.notifications.push({ message: msg, type: 'alert' });
        sendNotificationToUser(user._id.toString(), { message: msg, type: 'alert' });
      }
    }
    if (changed) updates.push(user.save());
  }
  if (updates.length) await Promise.all(updates);
};

const sendNotificationToUser = (userId, notification) => {
  if (!io) return;
  io.to(`user_${userId}`).emit('notification', notification);
};

const getCachedStockData = () => cachedStockData;

module.exports = {
  initializeSocketService,
  broadcastMarketUpdate,
  sendNotificationToUser,
  getCachedStockData,
};
