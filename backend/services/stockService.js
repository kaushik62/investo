const axios  = require('axios');
const redis  = require('./redisService');

// ── Stock master list ─────────────────────────────────────────
const INDIAN_STOCKS = [
  { symbol: 'RELIANCE.BSE',   nsSymbol: 'RELIANCE.NS',   name: 'Reliance Industries Ltd'    },
  { symbol: 'TCS.BSE',        nsSymbol: 'TCS.NS',         name: 'Tata Consultancy Services'  },
  { symbol: 'INFY.BSE',       nsSymbol: 'INFY.NS',        name: 'Infosys Ltd'                },
  { symbol: 'HDFCBANK.BSE',   nsSymbol: 'HDFCBANK.NS',    name: 'HDFC Bank Ltd'              },
  { symbol: 'ICICIBANK.BSE',  nsSymbol: 'ICICIBANK.NS',   name: 'ICICI Bank Ltd'             },
  { symbol: 'SBIN.BSE',       nsSymbol: 'SBIN.NS',        name: 'State Bank of India'        },
  { symbol: 'TATAMOTORS.BSE', nsSymbol: 'TATAMOTORS.NS',  name: 'Tata Motors Ltd'            },
  { symbol: 'LT.BSE',         nsSymbol: 'LT.NS',          name: 'Larsen & Toubro Ltd'        },
  { symbol: 'ITC.BSE',        nsSymbol: 'ITC.NS',         name: 'ITC Ltd'                    },
  { symbol: 'BHARTIARTL.BSE', nsSymbol: 'BHARTIARTL.NS',  name: 'Bharti Airtel Ltd'          },
];

const BASE_PRICES = {
  'RELIANCE.BSE':2920,'TCS.BSE':4050,'INFY.BSE':1680,'HDFCBANK.BSE':1740,
  'ICICIBANK.BSE':1200,'SBIN.BSE':830,'TATAMOTORS.BSE':1010,'LT.BSE':3700,
  'ITC.BSE':490,'BHARTIARTL.BSE':1620,
};

// ── HTTP client ───────────────────────────────────────────────
const http = axios.create({
  baseURL: 'https://www.alphavantage.co',
  timeout: 12000,
  headers: { 'User-Agent': 'Investo/1.0' },
});

// ── AV rate-limit queue (1 req / 1.5 s) ──────────────────────
const _q = [];
let _busy = false;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    _q.push({ fn, resolve, reject });
    if (!_busy) drainQ();
  });
}
async function drainQ() {
  if (_busy || !_q.length) return;
  _busy = true;
  const { fn, resolve, reject } = _q.shift();
  try    { resolve(await fn()); }
  catch  (e) { reject(e); }
  finally {
    await sleep(1500);
    _busy = false;
    drainQ();
  }
}

// ── In-memory cache (backup if Redis down) ────────────────────
const _mem = {};     // symbol → { quote, at }
const MEM_TTL = 5 * 60 * 1000;

// ── Alpha Vantage fetch ───────────────────────────────────────
async function fetchAV(params) {
  const key = process.env.ALPHA_VANTAGE_KEY;
  if (!key || key === 'YOUR_FREE_KEY_HERE') throw new Error('ALPHA_VANTAGE_KEY not set');
  const { data } = await http.get('/query', { params: { ...params, apikey: key } });
  if (data?.Note)        throw new Error('AV rate limited: ' + data.Note);
  if (data?.Information) throw new Error('AV info: '         + data.Information);
  return data;
}

function parseGlobalQuote(data, info) {
  const q = data?.['Global Quote'];
  if (!q?.['05. price']) throw new Error('Empty Global Quote');
  const price  = parseFloat(q['05. price']);
  const prev   = parseFloat(q['08. previous close'] || price);
  const change = parseFloat((price - prev).toFixed(2));
  const pct    = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;
  return {
    symbol:           info.nsSymbol,
    avSymbol:         info.symbol,
    name:             info.name,
    price,
    change,
    changePercent:    pct,
    open:             parseFloat(q['02. open']  || price),
    high:             parseFloat(q['03. high']  || price),
    low:              parseFloat(q['04. low']   || price),
    volume:           parseInt(q['06. volume']  || '0', 10),
    marketCap:        0,
    previousClose:    prev,
    fiftyTwoWeekHigh: parseFloat(q['52. week high']  || 0),
    fiftyTwoWeekLow:  parseFloat(q['52. week low']   || 0),
    latestTradingDay: q['07. latest trading day'] || '',
    currency:         'INR',
    exchange:         'NSE/BSE',
    timestamp:        new Date(),
    source:           'live',
  };
}

// ── Random walk (keeps UI ticking between real fetches) ───────
function randomWalk(q) {
  const drift  = (Math.random() - 0.495) * 0.0005;
  const price  = parseFloat(Math.max(q.price * (1 + drift), 1).toFixed(2));
  const change = parseFloat((price - q.previousClose).toFixed(2));
  const pct    = q.previousClose > 0
    ? parseFloat(((change / q.previousClose) * 100).toFixed(2)) : 0;
  return { ...q, price, change, changePercent: pct, timestamp: new Date() };
}

// ── Mock (when AV unavailable) ────────────────────────────────
const _mockState = {};
function mockQuote(info) {
  const sym  = info.nsSymbol;
  const base = BASE_PRICES[info.symbol] || 1000;
  if (!_mockState[sym]) _mockState[sym] = { price: base, at: Date.now() };
  const s = _mockState[sym];
  const elapsed = Math.min((Date.now() - s.at) / 1000, 30);
  s.price *= 1 + (Math.random() - 0.495) * 0.0008 * elapsed;
  s.price  = Math.max(base * 0.5, s.price);
  s.at     = Date.now();
  const price  = parseFloat(s.price.toFixed(2));
  const change = parseFloat((price - base).toFixed(2));
  return {
    symbol: sym, avSymbol: info.symbol, name: info.name,
    price, change,
    changePercent:    parseFloat(((change / base) * 100).toFixed(2)),
    open:             parseFloat((base * (1 + (Math.random()-0.5)*0.004)).toFixed(2)),
    high:             parseFloat((Math.max(price,base)*(1+Math.random()*0.007)).toFixed(2)),
    low:              parseFloat((Math.min(price,base)*(1-Math.random()*0.007)).toFixed(2)),
    volume:           Math.floor(Math.random()*4_000_000)+300_000,
    marketCap:        0, previousClose: base,
    fiftyTwoWeekHigh: parseFloat((base*1.35).toFixed(2)),
    fiftyTwoWeekLow:  parseFloat((base*0.68).toFixed(2)),
    currency:'INR', exchange:'NSE', timestamp:new Date(), source:'mock',
  };
}

// ── Rotation state ────────────────────────────────────────────
let _rotateIdx = 0;

// ── Fetch one stock with Redis → mem → AV → mock ─────────────
async function fetchOne(info) {
  const rKey = redis.KEYS.stockQuote(info.nsSymbol);

  // 1. Redis cache
  const cached = await redis.get(rKey);
  if (cached) return randomWalk(cached);

  // 2. In-memory cache
  const mem = _mem[info.symbol];
  if (mem && Date.now() - mem.at < MEM_TTL) return randomWalk(mem.quote);

  // 3. Alpha Vantage
  const data  = await enqueue(() => fetchAV({ function: 'GLOBAL_QUOTE', symbol: info.symbol }));
  const quote = parseGlobalQuote(data, info);

  // Store in Redis (60s TTL) and memory
  await redis.set(rKey, quote, redis.TTL.stocks);
  _mem[info.symbol] = { quote, at: Date.now() };
  return quote;
}

// ── Public: single quote ──────────────────────────────────────
async function getStockQuote(nsSymbol) {
  const info = INDIAN_STOCKS.find(s => s.nsSymbol === nsSymbol || s.symbol === nsSymbol);
  if (!info) throw new Error(`Unknown symbol: ${nsSymbol}`);
  try {
    return await fetchOne(info);
  } catch (err) {
    if (!_mockState['w_'+nsSymbol]) {
      if (!err.message.includes('not set')) console.warn(`⚠️  AV fetch failed ${nsSymbol}: ${err.message}`);
      _mockState['w_'+nsSymbol] = true;
    }
    return mockQuote(info);
  }
}

// ── Public: all quotes (Redis batch → rotation refresh) ───────
async function getAllStockQuotes() {
  // Try bulk Redis read
  const rKey = redis.KEYS.allStocks;
  const cached = await redis.get(rKey);
  if (cached && Array.isArray(cached)) {
    return cached.map(q => randomWalk(q));
  }

  const key = process.env.ALPHA_VANTAGE_KEY;
  const hasKey = key && key !== 'YOUR_FREE_KEY_HERE';

  if (!hasKey) {
    if (!_mockState.__warned) {
      console.warn('⚠️  ALPHA_VANTAGE_KEY not set — using mock prices.');
      console.warn('   Get free key → https://www.alphavantage.co/support/#api-key');
      _mockState.__warned = true;
    }
    return INDIAN_STOCKS.map(s => mockQuote(s));
  }

  // Rotate: one real AV call per cycle, rest from mem/mock
  const toRefresh = INDIAN_STOCKS[_rotateIdx % INDIAN_STOCKS.length];
  _rotateIdx++;

  // Kick off fresh fetch non-blockingly
  fetchOne(toRefresh).catch(() => {});

  // Gather all
  const results = await Promise.all(
    INDIAN_STOCKS.map(async (info) => {
      try   { return await fetchOne(info); }
      catch { return mockQuote(info); }
    })
  );

  // Cache the full list for 60s
  await redis.set(rKey, results, redis.TTL.stocks);
  return results;
}

// ── Historical data ───────────────────────────────────────────
async function getHistoricalData(nsSymbol, period1, period2, interval = '1d') {
  const info  = INDIAN_STOCKS.find(s => s.nsSymbol === nsSymbol || s.symbol === nsSymbol);
  if (!info) return generateMockHistorical(nsSymbol, period1, period2);

  // Determine timeframe key
  const tfKey = `${period1}_${period2}_${interval}`;
  const rKey  = redis.KEYS.stockHistory(info.nsSymbol, tfKey);

  // Redis cache
  const cached = await redis.get(rKey);
  if (cached) return cached;

  const key = process.env.ALPHA_VANTAGE_KEY;
  if (!key || key === 'YOUR_FREE_KEY_HERE') return generateMockHistorical(nsSymbol, period1, period2);

  try {
    let fn, timeKey;
    if (interval === '5m')  { fn = 'TIME_SERIES_INTRADAY'; timeKey = 'Time Series (5min)'; }
    else if (interval === '1h') { fn = 'TIME_SERIES_INTRADAY'; timeKey = 'Time Series (60min)'; }
    else { fn = 'TIME_SERIES_DAILY'; timeKey = 'Time Series (Daily)'; }

    const params = { function: fn, symbol: info.symbol, outputsize: 'full' };
    if (fn === 'TIME_SERIES_INTRADAY') params.interval = interval === '5m' ? '5min' : '60min';

    const data   = await enqueue(() => fetchAV(params));
    const series = data?.[timeKey];
    if (!series) throw new Error('No time series data');

    const start = new Date(period1).getTime();
    const end   = new Date(period2).getTime();

    const result = Object.entries(series)
      .filter(([date]) => { const t = new Date(date).getTime(); return t >= start && t <= end; })
      .map(([date, v]) => ({
        date,
        open:   parseFloat(v['1. open']),
        high:   parseFloat(v['2. high']),
        low:    parseFloat(v['3. low']),
        close:  parseFloat(v['4. close']),
        volume: parseInt(v['5. volume'], 10),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    await redis.set(rKey, result, redis.TTL.history);
    return result;
  } catch (err) {
    console.warn(`⚠️  Historical fetch failed ${nsSymbol}: ${err.message}`);
    return generateMockHistorical(nsSymbol, period1, period2);
  }
}

function generateMockHistorical(symbol, period1, period2) {
  const avSym = INDIAN_STOCKS.find(s => s.nsSymbol === symbol)?.symbol || symbol;
  const base  = BASE_PRICES[avSym] || 1000;
  const start = new Date(period1);
  const end   = new Date(period2);
  const data  = [];
  let price   = base * 0.88;
  for (let i = 0; i <= Math.ceil((end-start)/86_400_000); i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    if (d.getDay()===0 || d.getDay()===6) continue;
    price *= 1 + (Math.random()-0.48)*0.018;
    const p = parseFloat(price.toFixed(2));
    data.push({ date: d.toISOString().split('T')[0], open:parseFloat((p*.999).toFixed(2)), high:parseFloat((p*1.012).toFixed(2)), low:parseFloat((p*.988).toFixed(2)), close:p, volume:Math.floor(Math.random()*2_500_000)+100_000 });
  }
  return data;
}

// ── NIFTY 50 ─────────────────────────────────────────────────
async function getNifty50Quote() {
  const rKey   = redis.KEYS.nifty;
  const cached = await redis.get(rKey);
  if (cached) return cached;

  const key = process.env.ALPHA_VANTAGE_KEY;
  if (key && key !== 'YOUR_FREE_KEY_HERE') {
    try {
      const data = await enqueue(() => fetchAV({ function: 'GLOBAL_QUOTE', symbol: 'NSEI.BSE' }));
      const q    = data?.['Global Quote'];
      if (q?.['05. price']) {
        const price = parseFloat(q['05. price']);
        const prev  = parseFloat(q['08. previous close'] || price);
        const change = parseFloat((price-prev).toFixed(2));
        const pct    = parseFloat(((change/prev)*100).toFixed(2));
        const result = { symbol:'NIFTY50', name:'Nifty 50', price, change, changePercent:pct, timestamp:new Date() };
        await redis.set(rKey, result, redis.TTL.stocks);
        return result;
      }
    } catch { /* fall through */ }
  }

  // Mock NIFTY
  const change = parseFloat(((Math.random()-0.48)*180).toFixed(2));
  const price  = parseFloat((24500+change).toFixed(2));
  return { symbol:'NIFTY50', name:'Nifty 50', price, change, changePercent:parseFloat(((change/24500)*100).toFixed(2)), timestamp:new Date() };
}

module.exports = { getStockQuote, getAllStockQuotes, getHistoricalData, getNifty50Quote, INDIAN_STOCKS };
