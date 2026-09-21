const express = require("express");
const router = express.Router();

const Stock = require("../models/Stock");

// ============================================================
// LIVE STOCK API
// ============================================================

const LIVE_API =
  "https://stock-api.techstockpro2026.workers.dev";

const LIVE_SYMBOLS = [
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "ITC",
  "BHARTIARTL",
];

// ============================================================
// HELPER: Convert API values to numbers
// ============================================================

function parseMarketValue(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  // Normal number
  if (typeof value === "number") {
    return Number(value) || 0;
  }

  // API object format:
  // { value: 1242.4, unit: "INR" }
  if (
    typeof value === "object" &&
    value !== null &&
    value.value !== undefined
  ) {
    return Number(value.value) || 0;
  }

  const text = String(value).trim();

  if (!text) {
    return 0;
  }

  const match = text.match(/([\d,.]+)/);

  if (!match) {
    return 0;
  }

  const number = parseFloat(
    match[1].replace(/,/g, "")
  );

  if (Number.isNaN(number)) {
    return 0;
  }

  const lowerText = text.toLowerCase();

  // Crore
  if (
    lowerText.includes("crore") ||
    lowerText.includes("crores")
  ) {
    return number * 10000000;
  }

  // Lakh
  if (
    lowerText.includes("lakh") ||
    lowerText.includes("lakhs")
  ) {
    return number * 100000;
  }

  return number;
}

// ============================================================
// HELPER: Get value from possible API field names
// ============================================================

function getValue(object, fields, defaultValue = null) {
  if (!object || typeof object !== "object") {
    return defaultValue;
  }

  for (const field of fields) {
    if (
      object[field] !== undefined &&
      object[field] !== null
    ) {
      return object[field];
    }
  }

  return defaultValue;
}

// ============================================================
// FORMAT LIVE STOCK
// ============================================================

function formatLiveStock(stock, forcedSymbol = null) {
  if (!stock) {
    return null;
  }

  // ----------------------------------------------------------
  // Symbol
  // ----------------------------------------------------------

  const symbol =
    forcedSymbol ||
    getValue(stock, [
      "symbol",
      "ticker",
      "stock_symbol",
      "stockSymbol",
      "code",
    ]) ||
    "UNKNOWN";

  // ----------------------------------------------------------
  // Company name
  // ----------------------------------------------------------

  const companyName =
    getValue(stock, [
      "company_name",
      "companyName",
      "name",
      "company",
      "company_title",
    ]) || symbol;

  // ----------------------------------------------------------
  // Price
  // ----------------------------------------------------------

  const price = parseMarketValue(
    getValue(stock, [
      "price",
      "last_price",
      "lastPrice",
      "ltp",
      "current_price",
      "currentPrice",
    ])
  );

  // ----------------------------------------------------------
  // Change
  // ----------------------------------------------------------

  const change = parseMarketValue(
    getValue(stock, [
      "change",
      "price_change",
      "priceChange",
      "change_value",
      "changeValue",
    ])
  );

  // ----------------------------------------------------------
  // Change %
  // ----------------------------------------------------------

  const changePercent = parseMarketValue(
    getValue(stock, [
      "change_percent",
      "changePercent",
      "change_percentage",
      "changePercentage",
      "percent_change",
      "percentage_change",
    ])
  );

  // ----------------------------------------------------------
  // Volume
  // ----------------------------------------------------------

  const volume = parseMarketValue(
    getValue(stock, [
      "volume",
      "trading_volume",
      "tradingVolume",
    ])
  );

  // ----------------------------------------------------------
  // Market Cap
  // ----------------------------------------------------------

  const marketCap = parseMarketValue(
    getValue(stock, [
      "market_cap",
      "marketCap",
      "market_capitalization",
      "marketCapitalization",
    ])
  );

  // ----------------------------------------------------------
  // Sector
  // ----------------------------------------------------------

  const sector =
    getValue(stock, [
      "sector",
      "industry",
    ]) || "Unknown";

  // ----------------------------------------------------------
  // Exchange
  // ----------------------------------------------------------

  const exchange =
    getValue(stock, [
      "exchange",
      "exchange_name",
      "exchangeName",
    ]) || "NSE";

  // ----------------------------------------------------------
  // Last updated
  // ----------------------------------------------------------

  const lastUpdated =
    getValue(stock, [
      "timestamp",
      "last_updated",
      "lastUpdated",
      "updated_at",
      "updatedAt",
    ]) || new Date().toISOString();

  // ----------------------------------------------------------
  // Return TechStock format
  // ----------------------------------------------------------

  return {
    symbol: String(symbol).toUpperCase(),

    name: companyName,

    price: Number(price) || 0,

    change: Number(change) || 0,

    changePercent:
      Number(changePercent) || 0,

    volume: Number(volume) || 0,

    marketCap:
      Number(marketCap) || 0,

    sector,

    exchange:
      String(exchange).toUpperCase(),

    lastUpdated,

    dataSource: "LIVE_EXTERNAL_API",
  };
}

// ============================================================
// GET ALL LIVE STOCKS
// GET /api/stocks
// ============================================================

router.get("/", async (req, res) => {
  try {
    const symbols = LIVE_SYMBOLS.join(",");

    const apiUrl =
      `${LIVE_API}/stock/list?symbols=${encodeURIComponent(
        symbols
      )}`;

    console.log("----------------------------------------");
    console.log("Fetching live stock data");
    console.log(apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `External API returned HTTP ${response.status}`
      );
    }

    const result = await response.json();

    console.log(
      "External API response received"
    );

    // --------------------------------------------------------
    // Find stock array
    // --------------------------------------------------------

    let stocks = [];

    if (Array.isArray(result)) {
      stocks = result;
    } else if (Array.isArray(result.stocks)) {
      stocks = result.stocks;
    } else if (Array.isArray(result.data)) {
      stocks = result.data;
    } else if (Array.isArray(result.result)) {
      stocks = result.result;
    }

    console.log(
      `Received ${stocks.length} stocks`
    );

    // --------------------------------------------------------
    // Format stocks
    // --------------------------------------------------------

    const formattedStocks = stocks
      .map((stock, index) => {

        /*
         * If API does not provide symbol inside each stock,
         * use the requested symbol according to its position.
         */

        const possibleSymbol =
          getValue(stock, [
            "symbol",
            "ticker",
            "stock_symbol",
            "stockSymbol",
            "code",
          ]);

        const forcedSymbol =
          possibleSymbol ||
          LIVE_SYMBOLS[index] ||
          null;

        return formatLiveStock(
          stock,
          forcedSymbol
        );
      })
      .filter(Boolean);

    // --------------------------------------------------------
    // Make sure symbols are correct
    // --------------------------------------------------------

    const finalStocks = formattedStocks.map(
      (stock, index) => ({
        ...stock,

        symbol:
          stock.symbol === "UNKNOWN"
            ? LIVE_SYMBOLS[index] || stock.symbol
            : stock.symbol,
      })
    );

    // --------------------------------------------------------
    // Check if data was actually returned
    // --------------------------------------------------------

    if (finalStocks.length === 0) {
      console.error(
        "No usable stock data returned"
      );

      return res.status(502).json({
        message:
          "External stock API returned no usable data",

        dataSource:
          "LIVE_EXTERNAL_API",
      });
    }

    console.log(
      `Successfully formatted ${finalStocks.length} stocks`
    );

    console.log("----------------------------------------");

    res.json(finalStocks);

  } catch (error) {

    console.error(
      "LIVE STOCK API ERROR:",
      error.message
    );

    res.status(500).json({
      message:
        "Failed to fetch live stock data",

      error:
        error.message,

      dataSource:
        "LIVE_EXTERNAL_API",
    });
  }
});

// ============================================================
// GET SINGLE LIVE STOCK
// GET /api/stocks/:symbol
// ============================================================

router.get("/:symbol", async (req, res) => {
  try {
    const symbol =
      String(req.params.symbol).toUpperCase();

    const apiUrl =
      `${LIVE_API}/stock?symbol=${encodeURIComponent(
        symbol
      )}`;

    console.log("----------------------------------------");
    console.log(
      `Fetching live stock: ${symbol}`
    );
    console.log(apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `External API returned HTTP ${response.status}`
      );
    }

    const result = await response.json();

    // --------------------------------------------------------
    // Find stock object
    // --------------------------------------------------------

    let stock = null;

    if (
      result &&
      result.data
    ) {
      stock = result.data;

    } else if (
      result &&
      result.stock
    ) {
      stock = result.stock;

    } else if (
      result &&
      result.result
    ) {
      stock = result.result;

    } else if (
      result &&
      result.symbol
    ) {
      stock = result;
    }

    if (!stock) {
      return res.status(404).json({
        message:
          `Stock ${symbol} not found`,
      });
    }

    // --------------------------------------------------------
    // IMPORTANT:
    // Force the requested symbol
    // --------------------------------------------------------

    const formattedStock =
      formatLiveStock(
        stock,
        symbol
      );

    if (!formattedStock) {
      return res.status(404).json({
        message:
          `Unable to format stock ${symbol}`,
      });
    }

    console.log(
      "Formatted stock:",
      formattedStock
    );

    console.log("----------------------------------------");

    res.json(formattedStock);

  } catch (error) {

    console.error(
      `LIVE STOCK ERROR (${req.params.symbol}):`,
      error.message
    );

    res.status(500).json({
      message:
        "Failed to fetch stock data",

      error:
        error.message,

      dataSource:
        "LIVE_EXTERNAL_API",
    });
  }
});

// ============================================================
// CREATE STOCK
// POST /api/stocks
// MongoDB
// ============================================================

router.post("/", async (req, res) => {
  try {
    const stock =
      new Stock(req.body);

    const savedStock =
      await stock.save();

    res.status(201).json(
      savedStock
    );

  } catch (error) {

    console.error(
      "CREATE STOCK ERROR:",
      error.message
    );

    res.status(500).json({
      message:
        "Failed to create stock",

      error:
        error.message,
    });
  }
});

// ============================================================
// UPDATE STOCK
// PUT /api/stocks/:id
// MongoDB
// ============================================================

router.put("/:id", async (req, res) => {
  try {

    const updatedStock =
      await Stock.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedStock) {
      return res.status(404).json({
        message:
          "Stock not found",
      });
    }

    res.json(
      updatedStock
    );

  } catch (error) {

    console.error(
      "UPDATE STOCK ERROR:",
      error.message
    );

    res.status(500).json({
      message:
        "Failed to update stock",

      error:
        error.message,
    });
  }
});

// ============================================================
// DELETE STOCK
// DELETE /api/stocks/:id
// MongoDB
// ============================================================

router.delete("/:id", async (req, res) => {
  try {

    const deletedStock =
      await Stock.findByIdAndDelete(
        req.params.id
      );

    if (!deletedStock) {
      return res.status(404).json({
        message:
          "Stock not found",
      });
    }

    res.json({
      message:
        "Stock deleted successfully",

      stock:
        deletedStock,
    });

  } catch (error) {

    console.error(
      "DELETE STOCK ERROR:",
      error.message
    );

    res.status(500).json({
      message:
        "Failed to delete stock",

      error:
        error.message,
    });
  }
});

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;