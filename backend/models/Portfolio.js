const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    name: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    averagePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  {
    _id: false
  }
);

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true
    },

    cashBalance: {
      type: Number,
      required: true,
      default: 100000
    },

    holdings: {
      type: [holdingSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Portfolio", portfolioSchema);