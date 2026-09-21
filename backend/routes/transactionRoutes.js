const express = require("express");
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const Stock = require("../models/Stock");

const router = express.Router();

// BUY STOCK
router.post("/buy", async (req, res) => {
  try {
    const { userId, symbol, quantity } = req.body;

    if (!userId || !symbol || !quantity) {
      return res.status(400).json({
        message: "userId, symbol and quantity are required"
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0"
      });
    }

    // Find stock
    const stock = await Stock.findOne({
      symbol: symbol.toUpperCase()
    });

    if (!stock) {
      return res.status(404).json({
        message: "Stock not found"
      });
    }

    // Find portfolio
    let portfolio = await Portfolio.findOne({ userId });

    if (!portfolio) {
      portfolio = await Portfolio.create({
        userId,
        cashBalance: 100000,
        holdings: []
      });
    }

    const totalAmount = stock.price * quantity;

    // Check balance
    if (portfolio.cashBalance < totalAmount) {
      return res.status(400).json({
        message: "Insufficient cash balance"
      });
    }

    // Find existing holding
    const holding = portfolio.holdings.find(
      (item) => item.symbol === stock.symbol
    );

    if (holding) {
      const oldQuantity = holding.quantity;
      const oldAveragePrice = holding.averagePrice;

      const newQuantity = oldQuantity + quantity;

      const newAveragePrice =
        (oldQuantity * oldAveragePrice + quantity * stock.price) /
        newQuantity;

      holding.quantity = newQuantity;
      holding.averagePrice = newAveragePrice;
    } else {
      portfolio.holdings.push({
        symbol: stock.symbol,
        name: stock.name,
        quantity,
        averagePrice: stock.price
      });
    }

    portfolio.cashBalance -= totalAmount;

    await portfolio.save();

    // Save transaction
    const transaction = await Transaction.create({
      userId,
      symbol: stock.symbol,
      stockName: stock.name,
      type: "BUY",
      quantity,
      price: stock.price,
      totalAmount
    });

    res.status(201).json({
      message: "Stock purchased successfully",
      portfolio,
      transaction
    });
  } catch (error) {
    res.status(500).json({
      message: "Buy transaction failed",
      error: error.message
    });
  }
});

// SELL STOCK
router.post("/sell", async (req, res) => {
  try {
    const { userId, symbol, quantity } = req.body;

    if (!userId || !symbol || !quantity) {
      return res.status(400).json({
        message: "userId, symbol and quantity are required"
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0"
      });
    }

    // Find stock
    const stock = await Stock.findOne({
      symbol: symbol.toUpperCase()
    });

    if (!stock) {
      return res.status(404).json({
        message: "Stock not found"
      });
    }

    // Find portfolio
    const portfolio = await Portfolio.findOne({ userId });

    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found"
      });
    }

    // Find holding
    const holdingIndex = portfolio.holdings.findIndex(
      (item) => item.symbol === stock.symbol
    );

    if (holdingIndex === -1) {
      return res.status(400).json({
        message: "You don't own this stock"
      });
    }

    const holding = portfolio.holdings[holdingIndex];

    // Check quantity
    if (holding.quantity < quantity) {
      return res.status(400).json({
        message: `You only own ${holding.quantity} shares`
      });
    }

    const totalAmount = stock.price * quantity;

    // Reduce quantity
    holding.quantity -= quantity;

    // Remove holding if quantity becomes 0
    if (holding.quantity === 0) {
      portfolio.holdings.splice(holdingIndex, 1);
    }

    // Add money
    portfolio.cashBalance += totalAmount;

    await portfolio.save();

    // Save transaction
    const transaction = await Transaction.create({
      userId,
      symbol: stock.symbol,
      stockName: stock.name,
      type: "SELL",
      quantity,
      price: stock.price,
      totalAmount
    });

    res.status(201).json({
      message: "Stock sold successfully",
      portfolio,
      transaction
    });
  } catch (error) {
    res.status(500).json({
      message: "Sell transaction failed",
      error: error.message
    });
  }
});

// Get transaction history
router.get("/:userId", async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.params.userId
    }).sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch transactions",
      error: error.message
    });
  }
});

module.exports = router;