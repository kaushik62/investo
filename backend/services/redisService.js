const Redis = require('ioredis');

// ── In-memory fallback store ──────────────────────────────────
const memStore = new Map();

let client   = null;
let isReady  = false;
let _warned  = false;

// ── Connect ───────────────────────────────────────────────────
function connect() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  client = new Redis(url, {
    lazyConnect:         true,
    enableOfflineQueue:  false,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      // Stop retrying after 3 attempts — fall through to memory cache
      if (times > 3) return null;
      return Math.min(times * 300, 1000);
    },
  });

  client.on('ready', () => {
    isReady = true;
    console.log(`✅ Redis connected → ${url}`);
  });

  client.on('error', (err) => {
    isReady = false;
    if (!_warned) {
      _warned = true;
      console.warn('⚠️  Redis unavailable — using in-memory cache (app works normally).');
      console.warn('   Install Redis for better performance: https://redis.io/docs/getting-started/');
      console.warn('   Error:', err.message);
    }
  });

  client.on('reconnecting', () => { isReady = false; });

  client.connect().catch(() => {});
  return client;
}

// ── SET ───────────────────────────────────────────────────────
async function set(key, value, ttlSeconds = 300) {
  const serialized = JSON.stringify(value);
  if (isReady) {
    try {
      await client.set(key, serialized, 'EX', ttlSeconds);
      return;
    } catch { isReady = false; }
  }
  // Memory fallback
  memStore.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// ── GET ───────────────────────────────────────────────────────
async function get(key) {
  if (isReady) {
    try {
      const raw = await client.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch { isReady = false; }
  }
  // Memory fallback
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
  return JSON.parse(entry.value);
}

// ── DEL ───────────────────────────────────────────────────────
async function del(key) {
  if (isReady) {
    try { await client.del(key); return; }
    catch { isReady = false; }
  }
  memStore.delete(key);
}

// ── DEL by pattern ────────────────────────────────────────────
async function delPattern(pattern) {
  if (isReady) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(...keys);
      return;
    } catch { isReady = false; }
  }
  // Memory fallback: match by prefix
  const prefix = pattern.replace('*', '');
  for (const k of memStore.keys()) {
    if (k.startsWith(prefix)) memStore.delete(k);
  }
}

// ── Status ────────────────────────────────────────────────────
function getStatus() {
  return {
    connected: isReady,
    backend:   isReady ? 'redis' : 'memory',
    url:       process.env.REDIS_URL || 'redis://localhost:6379',
  };
}

// ── Cache keys (centralised) ──────────────────────────────────
const KEYS = {
  allStocks:      'stocks:all',
  nifty:          'stocks:nifty',
  stockQuote:    (sym) => `stocks:quote:${sym}`,
  stockHistory:  (sym, tf) => `stocks:history:${sym}:${tf}`,
  portfolio:     (uid) => `portfolio:${uid}`,
  leaderboard:    'leaderboard:all',
  adminStats:     'admin:stats',
};

const TTL = {
  stocks:      60,       // 1 min  — market data
  history:     300,      // 5 min  — historical charts
  portfolio:   30,       // 30 sec — portfolio (invalidated on trade)
  leaderboard: 120,      // 2 min
  adminStats:  60,       // 1 min
};

module.exports = { connect, set, get, del, delPattern, getStatus, KEYS, TTL };
