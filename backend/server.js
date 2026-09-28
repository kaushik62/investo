const express    = require('express');
const http       = require('http');
const socketIo   = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const { setupDatabase }           = require('./utils/setupDatabase');
const { initializeSocketService } = require('./services/socketService');
const redis                       = require('./services/redisService');

const app    = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
    methods:     ['GET', 'POST'],
    credentials: true,
  },
});

redis.connect();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

const isDev = process.env.NODE_ENV !== 'production';

// Auth routes: strict — 20 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      isDev ? 200 : 20,
  message:  { success: false, error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => isDev,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      isDev ? 10000 : 500,
  message:  { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => isDev,
});

// Apply limiters
app.use('/api/auth', authLimiter);
app.use('/api/',     apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (isDev) app.use(morgan('dev'));

// Attach io to requests
app.use((req, _res, next) => { req.io = io; next(); });

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/stocks',        require('./routes/stocks'));
app.use('/api/trades',        require('./routes/trades'));
app.use('/api/portfolio',     require('./routes/portfolio'));
app.use('/api/watchlist',     require('./routes/watchlist'));
app.use('/api/transactions',  require('./routes/transactions'));
app.use('/api/export',        require('./routes/export'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'OK', timestamp: new Date(), redis: redis.getStatus() })
);

// ── Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/Investo';
const PORT  = process.env.PORT || 5000;

mongoose.connect(MONGO)
  .then(async () => {
    console.log(`MongoDB connected  → ${MONGO}`);
    await setupDatabase();
    initializeSocketService(io);
    server.listen(PORT, () => {
      console.log(`Investo API    → http://localhost:${PORT}`);
      console.log(`Socket.IO          → live market updates active`);
      console.log(`Rate limiting      → ${isDev ? 'DISABLED (development mode)' : 'ENABLED (production)'}`);
    });
  })
  .catch((err) => {
    console.error('\nMongoDB connection failed!');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  });

module.exports = { app, io };
