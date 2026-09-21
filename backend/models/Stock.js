const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      default: 0
    },

    change: {
      type: Number,
      default: 0
    },

    changePercent: {
      type: Number,
      default: 0
    },

    volume: {
      type: Number,
      default: 0
    },

    marketCap: {
      type: Number,
      default: 0
    },

    sector: {
      type: String,
      default: "Other"
    },

    exchange: {
      type: String,
      default: "NSE"
    },

    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Stock", stockSchema);