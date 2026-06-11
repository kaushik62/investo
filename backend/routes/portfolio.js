const express = require('express');
const { getPortfolio } = require('../controllers/portfolioController');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, getPortfolio);

module.exports = router;
