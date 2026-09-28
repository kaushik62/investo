# Investo — Virtual Indian Stock Market Simulator

Full-stack MERN app with Redis caching, Alpha Vantage live prices, Socket.IO real-time updates.

---

## Quick Start

### 1. Install
```
npm run install:all
```

### 2. Configure
```
cd backend
copy .env.example .env
```
Edit `backend\.env` — minimum required:
```
MONGODB_URI=mongodb://localhost:27017/Investo
JWT_SECRET=any_long_random_string_here
ALPHA_VANTAGE_KEY=your_free_key_here   ← get at alphavantage.co
```

### 3. Run — open TWO terminals

**Terminal 1 — Backend (port 5000)**
```
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend (port 3000)**
```
cd frontend
npm install
npm run dev
```

---

## Redis Caching

Redis is **optional** — the app works without it using in-memory fallback.

| Cache Key | TTL | Content |
|-----------|-----|---------|
| `stocks:all` | 60s | All stock quotes |
| `stocks:quote:{sym}` | 60s | Individual quote |
| `stocks:history:{sym}:{tf}` | 5min | Historical chart data |
| `portfolio:{userId}` | 30s | User portfolio (invalidated on trade) |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Backend | Node.js + Express + Socket.IO |
| Database | MongoDB + Mongoose |
| Cache | Redis (ioredis) with memory fallback |
| Auth | JWT + bcrypt |
| Market Data | Alpha Vantage API (free tier) |
| Exports | PDFKit (portfolio PDF) + direct CSV download |

---

## Structure

```
Investo/
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── controllers/     authController, stockController, portfolioController, tradeController
│   ├── middleware/      auth.js (JWT auth)
│   ├── models/          User, Portfolio, Transaction
│   ├── routes/          auth, stocks, trades, portfolio, watchlist, transactions,
│   │                    export, notifications
│   ├── services/        stockService (AV), socketService, redisService
│   └── utils/           setupDatabase.js (auto-seed)
└── frontend/
    └── src/
        ├── pages/       Login, Register, Dashboard, Market,
        │                StockDetail, Portfolio, Watchlist, Transactions, Profile
        ├── components/  Navbar, StockTicker, Spinner, ProtectedRoute, AppLayout
        ├── context/     AuthContext, MarketContext
        └── services/    api.js, socket.js
```

---

MIT License · Virtual trading only · No real money 🇮🇳

