const express = require('express');
const { auth } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Portfolio = require('../models/Portfolio');
const User = require('../models/User');
const { uploadToS3, getPresignedUrl } = require('../services/s3Service');
const { getAllStockQuotes } = require('../services/stockService');
const router = express.Router();

router.get('/transactions/csv', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const user = await User.findById(req.user._id);

    let csv = 'Date,Symbol,Company,Type,Quantity,Price,Total Amount,P&L\n';
    transactions.forEach(t => {
      csv += `${new Date(t.createdAt).toLocaleDateString('en-IN')},${t.symbol},"${t.companyName || ''}",${t.transactionType},${t.quantity},${t.price.toFixed(2)},${t.totalAmount.toFixed(2)},${t.profitLoss ? t.profitLoss.toFixed(2) : '0'}\n`;
    });

    const buffer = Buffer.from(csv, 'utf-8');
    const key = `exports/transactions/${user._id}_${Date.now()}.csv`;

    try {
      await uploadToS3(buffer, key, 'text/csv');
      const url = await getPresignedUrl(key);
      res.json({ success: true, data: { url, filename: 'transactions.csv' } });
    } catch (s3Error) {
      // Fallback: send directly
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      res.send(buffer);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/portfolio/pdf', auth, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const portfolio = await Portfolio.findOne({ userId: req.user._id });
    const user = await User.findById(req.user._id);
    const stocks = await getAllStockQuotes();
    const stockMap = {};
    stocks.forEach(s => { stockMap[s.symbol] = s; });

    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      const key = `exports/portfolios/${user._id}_${Date.now()}.pdf`;

      try {
        await uploadToS3(buffer, key, 'application/pdf');
        const url = await getPresignedUrl(key);
        res.json({ success: true, data: { url, filename: 'portfolio_report.pdf' } });
      } catch (s3Error) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=portfolio_report.pdf');
        res.send(buffer);
      }
    });

    // PDF Content
    doc.fontSize(24).fillColor('#1a1a2e').text('Investo', { align: 'center' });
    doc.fontSize(14).fillColor('#666').text('Portfolio Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#333');
    doc.text(`Investor: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`);
    doc.moveDown();

    doc.fontSize(14).fillColor('#1a1a2e').text('Portfolio Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');

    let totalInvested = 0, currentValue = user.walletBalance;
    if (portfolio?.holdings) {
      portfolio.holdings.forEach(h => {
        const price = stockMap[h.symbol]?.price || h.averageBuyPrice;
        totalInvested += h.averageBuyPrice * h.quantity;
        currentValue += price * h.quantity;
      });
    }

    doc.text(`Wallet Balance: ₹${user.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    doc.text(`Total Invested: ₹${totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    doc.text(`Current Portfolio Value: ₹${currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    const pl = currentValue - 1000000;
    doc.text(`Total P&L: ₹${pl.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${((pl/1000000)*100).toFixed(2)}%)`);
    doc.moveDown();

    if (portfolio?.holdings?.length > 0) {
      doc.fontSize(14).fillColor('#1a1a2e').text('Holdings', { underline: true });
      doc.moveDown(0.5);
      portfolio.holdings.forEach(h => {
        const price = stockMap[h.symbol]?.price || h.averageBuyPrice;
        const pl = (price - h.averageBuyPrice) * h.quantity;
        doc.fontSize(10).fillColor('#333');
        doc.text(`${h.symbol} | ${h.companyName || ''} | Qty: ${h.quantity} | Avg: ₹${h.averageBuyPrice.toFixed(2)} | CMP: ₹${price.toFixed(2)} | P&L: ₹${pl.toFixed(2)}`);
      });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
