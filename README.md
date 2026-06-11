# 📉 Investo — Virtual Indian Stock Market Simulator

Full-stack MERN app with Redis caching, Alpha Vantage live prices, Socket.IO real-time updates.

---

## ⚡ Quick Start

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

## 🔐 Admin Access

### Option A — Admin Login Page (recommended)
Go to: **http://localhost:3000/admin/login**

| Field    | Value                       |
|----------|-----------------------------|
| Email    | `admin@Investo.com`     |
| Password | `admin123456`               |

> Credentials are clickable on the login page — just click them to autofill.

### Option B — Regular login then navigate
Login as admin via http://localhost:3000/login → click your name → **Admin**

---

## 🛡️ Admin Capabilities

| Tab | Features |
|-----|---------|
| 📊 Overview | Daily trade chart, most traded stocks, revenue stats |
| 👥 Users | Search users, block/unblock, promote to admin, adjust wallet ₹, delete |
| 📋 Transactions | All trades across all users, filter by BUY/SELL |
| 🏆 Competition | Create/manage monthly competitions |
| 📢 Broadcast | Send real-time notification to ALL users via Socket.IO |

---

## 🗄️ Redis Caching

Redis is **optional** — the app works without it using in-memory fallback.

| Cache Key | TTL | Content |
|-----------|-----|---------|
| `stocks:all` | 60s | All stock quotes |
| `stocks:quote:{sym}` | 60s | Individual quote |
| `stocks:history:{sym}:{tf}` | 5min | Historical chart data |
| `portfolio:{userId}` | 30s | User portfolio (invalidated on trade) |
| `leaderboard:all` | 2min | Rankings |
| `admin:stats` | 60s | Admin dashboard stats |

### Install Redis:
**Windows:** https://github.com/microsoftarchive/redis/releases
**Mac:** `brew install redis && brew services start redis`
**Linux:** `sudo apt install redis-server && sudo systemctl start redis`

---

## 📊 Alpha Vantage (Live Prices)

Get free key: https://www.alphavantage.co/support/#api-key

Free tier: 25 req/day — enough with Redis caching (1 req per 60s rotation)

Without key: app uses realistic mock prices with random walk.

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Backend | Node.js + Express + Socket.IO |
| Database | MongoDB + Mongoose |
| Cache | Redis (ioredis) with memory fallback |
| Auth | JWT + bcrypt |
| Market Data | Alpha Vantage API (free tier) |
| Payments | Stripe (optional) |
| Exports | AWS S3 + PDFKit (optional) |

---

## 📁 Structure

```
Investo/
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── controllers/     authController, stockController, portfolioController, tradeController
│   ├── middleware/      auth.js (JWT + admin + premium guards)
│   ├── models/          User, Portfolio, Transaction, Competition
│   ├── routes/          auth, stocks, trades, portfolio, watchlist, transactions,
│   │                    leaderboard, admin, stripe, export, notifications
│   ├── services/        stockService (AV), socketService, cronService,
│   │                    redisService, s3Service
│   └── utils/           setupDatabase.js (auto-seed)
└── frontend/
    └── src/
        ├── pages/       Login, Register, AdminLogin, Dashboard, Market,
        │                StockDetail, Portfolio, Watchlist, Transactions,
        │                Leaderboard, Subscription, Profile, Admin
        ├── components/  Navbar, StockTicker, Spinner, ProtectedRoute, AppLayout
        ├── context/     AuthContext, MarketContext
        └── services/    api.js, socket.js
```

---

MIT License · Virtual trading only · No real money 🇮🇳
