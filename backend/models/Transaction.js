const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },

    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    stockName: {
      type: String,
      required: true
    },

    type: {
      type: String,
      required: true,
      enum: ["BUY", "SELL"]
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);