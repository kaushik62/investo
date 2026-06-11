const express = require('express');
const { buyStock, sellStock } = require('../controllers/tradeController');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.post('/buy', auth, buyStock);
router.post('/sell', auth, sellStock);

module.exports = router;
