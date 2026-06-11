const { getStockQuote, getAllStockQuotes, getHistoricalData, getNifty50Quote, INDIAN_STOCKS } = require('../services/stockService');
const { getCachedStockData } = require('../services/socketService');
const redis = require('../services/redisService');

const getMarketOverview = async (req, res) => {
  try {
    const [nifty, stocks] = await Promise.all([getNifty50Quote(), getAllStockQuotes()]);
    const sorted     = [...stocks].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
    const topGainers = sorted.filter(s => (s.changePercent ?? 0) > 0).slice(0, 5);
    const topLosers  = sorted.filter(s => (s.changePercent ?? 0) < 0).reverse().slice(0, 5);
    const mostActive = [...stocks].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 5);
    const source     = stocks[0]?.source ?? 'unknown';
    res.json({ success: true, data: { nifty, topGainers, topLosers, mostActive, allStocks: stocks, source } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllStocks = async (req, res) => {
  try {
    const cached = getCachedStockData();
    const stocks = cached.length > 0 ? cached : await getAllStockQuotes();
    res.json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStockDetails = async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await getStockQuote(symbol.toUpperCase());
    res.json({ success: true, data: quote });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStockHistory = async (req, res) => {
  try {
    const { symbol }          = req.params;
    const { timeframe = '1mo' } = req.query;
    const now = new Date();
    let period1, interval;
    switch (timeframe) {
      case '1d':  period1 = new Date(now - 1   * 86400000); interval = '5m';  break;
      case '1wk': period1 = new Date(now - 7   * 86400000); interval = '1h';  break;
      case '1mo': period1 = new Date(now - 30  * 86400000); interval = '1d';  break;
      case '6mo': period1 = new Date(now - 180 * 86400000); interval = '1d';  break;
      case '1y':  period1 = new Date(now - 365 * 86400000); interval = '1wk'; break;
      default:    period1 = new Date(now - 30  * 86400000); interval = '1d';
    }
    const history = await getHistoricalData(
      symbol.toUpperCase(),
      period1.toISOString().split('T')[0],
      now.toISOString().split('T')[0],
      interval
    );
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStockList = (_req, res) => {
  res.json({ success: true, data: INDIAN_STOCKS });
};

const getDataSource = async (_req, res) => {
  try {
    const cached   = getCachedStockData();
    const source   = cached[0]?.source ?? 'unknown';
    const isLive   = source === 'live';
    const redisStatus = redis.getStatus();
    res.json({
      success: true,
      data: {
        source,
        isLive,
        redis: redisStatus,
        message: isLive
          ? '✅ Live prices from Alpha Vantage (NSE/BSE)'
          : '⚠️  Mock prices — set ALPHA_VANTAGE_KEY in .env for live data',
        lastUpdate: cached[0]?.timestamp ?? null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getMarketOverview, getAllStocks, getStockDetails, getStockHistory, getStockList, getDataSource };
