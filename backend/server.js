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
const { startMarketCronJob }      = require('./services/cronService');
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

// ── Connect Redis ─────────────────────────────────────────────
redis.connect();

// ── Security Middleware ───────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Rate Limiters — separate limits per concern ───────────────
const isDev = process.env.NODE_ENV !== 'production';

// Auth routes: strict — 20 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      isDev ? 200 : 20,        // relaxed in dev
  message:  { success: false, error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => isDev,                 // completely skip in development
});

// API routes: generous — 500 per 1 min (covers cron + websocket polling)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,               // 1 minute window
  max:      isDev ? 10000 : 500,     // very generous; skip entirely in dev
  message:  { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => isDev,                 // skip entirely in development
});

// Apply limiters
app.use('/api/auth', authLimiter);
app.use('/api/',     apiLimiter);

// ── Body Parsing ──────────────────────────────────────────────
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Only log in dev (not noisy in prod)
if (isDev) app.use(morgan('dev'));

// Attach io to requests
app.use((req, _res, next) => { req.io = io; next(); });

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/stocks',        require('./routes/stocks'));
app.use('/api/trades',        require('./routes/trades'));
app.use('/api/portfolio',     require('./routes/portfolio'));
app.use('/api/watchlist',     require('./routes/watchlist'));
app.use('/api/transactions',  require('./routes/transactions'));
app.use('/api/leaderboard',   require('./routes/leaderboard'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/stripe',        require('./routes/stripe'));
app.use('/api/export',        require('./routes/export'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'OK', timestamp: new Date(), redis: redis.getStatus() })
);

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// ── MongoDB + Server Start ────────────────────────────────────
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/Investo';
const PORT  = process.env.PORT || 5000;

mongoose.connect(MONGO)
  .then(async () => {
    console.log(`✅ MongoDB connected  → ${MONGO}`);
    await setupDatabase();
    initializeSocketService(io);
    startMarketCronJob(io);
    server.listen(PORT, () => {
      console.log(`🚀 Investo API    → http://localhost:${PORT}`);
      console.log(`📡 Socket.IO          → live market updates active`);
      console.log(`🔓 Rate limiting      → ${isDev ? 'DISABLED (development mode)' : 'ENABLED (production)'}`);
    });
  })
  .catch((err) => {
    console.error('\n❌ MongoDB connection failed!');
    console.error(`   URI  : ${MONGO}`);
    console.error(`   Error: ${err.message}`);
    console.error('\n💡 Start MongoDB first:');
    console.error('   Windows : net start MongoDB');
    console.error('   Mac     : brew services start mongodb-community\n');
    process.exit(1);
  });

module.exports = { app, io };
