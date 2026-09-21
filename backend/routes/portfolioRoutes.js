const express = require("express");
const Portfolio = require("../models/Portfolio");

const router = express.Router();

// Get portfolio
router.get("/:userId", async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({
      userId: req.params.userId
    });

    // Create portfolio if user doesn't have one
    if (!portfolio) {
      portfolio = await Portfolio.create({
        userId: req.params.userId,
        cashBalance: 100000,
        holdings: []
      });
    }

    res.status(200).json(portfolio);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch portfolio",
      error: error.message
    });
  }
});

module.exports = router;