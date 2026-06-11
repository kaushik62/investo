const express = require('express');
const { getMarketOverview, getAllStocks, getStockDetails, getStockHistory, getStockList, getDataSource } = require('../controllers/stockController');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/overview',    auth, getMarketOverview);
router.get('/list',        auth, getStockList);
router.get('/source',      auth, getDataSource);       // ← tells you live vs mock
router.get('/:symbol/history', auth, getStockHistory);
router.get('/:symbol',     auth, getStockDetails);
router.get('/',            auth, getAllStocks);

module.exports = router;
