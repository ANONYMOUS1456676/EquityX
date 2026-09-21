import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import Chart from "chart.js/auto";
import { marketIndices } from "./data";

import "./main.css";
import "./components.css";
import "./animations.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const API_BASE_URL = "https://equityxxx.vercel.app/api";
const USER_ID = "testuser";

function App() {
  const [stocks, setStocks] = useState({});

  const [watchlist, setWatchlist] = useState([
    "RELIANCE",
    "TCS",
    "INFY"
  ]);

  const [filters, setFilters] = useState({
    search: "",
    sector: "",
    cap: ""
  });

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );

  const [marketStatus, setMarketStatus] = useState("LIVE");
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState(null);

  const [portfolio, setPortfolio] = useState({
    userId: USER_ID,
    cashBalance: 100000,
    holdings: []
  });

  const [transactions, setTransactions] = useState([]);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    document.body.className =
      theme === "light" ? "light-theme" : "dark-theme";

    const root = document.documentElement;

    if (theme === "light") {
      root.style.setProperty("--bg-primary", "#ffffff");
      root.style.setProperty("--bg-secondary", "#f8f9fa");
      root.style.setProperty("--bg-tertiary", "#e9ecef");
      root.style.setProperty("--bg-panel", "#ffffff");
      root.style.setProperty("--text-primary", "#212529");
      root.style.setProperty("--text-secondary", "#6c757d");
      root.style.setProperty("--border-color", "#dee2e6");
    } else {
      root.style.setProperty("--bg-primary", "#0a0e1a");
      root.style.setProperty("--bg-secondary", "#1a1f35");
      root.style.setProperty("--bg-tertiary", "#242b42");
      root.style.setProperty("--bg-panel", "#1e2438");
      root.style.setProperty("--text-primary", "#e6e8ef");
      root.style.setProperty("--text-secondary", "#9ca3b4");
      root.style.setProperty("--border-color", "#2d3748");
    }
  }, [theme]);

  const showMessage = useCallback(
    (text, type = "success") => {
      setMessage(text);
      setMessageType(type);

      setTimeout(() => {
        setMessage("");
      }, 3500);
    },
    []
  );

  const fetchStocks = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/stocks`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch stocks");
      }

      const data = await response.json();

      setStocks((previousStocks) => {
        const formattedStocks = {};

        data.forEach((stock) => {
          const oldStock = previousStocks[stock.symbol];

          const newPoint = {
            time: new Date(
              stock.lastUpdated
            ).toLocaleTimeString(),
            price: Number(stock.price),
            volume: Number(stock.volume || 0)
          };

          formattedStocks[stock.symbol] = {
            symbol: stock.symbol,
            name: stock.name,
            price: Number(stock.price),
            change: Number(stock.change),
            changePercent: Number(stock.changePercent),
            volume: Number(stock.volume || 0),
            marketCap: Number(stock.marketCap || 0),
            sector: stock.sector || "Unknown",
            exchange: stock.exchange || "NSE",
            lastUpdated: stock.lastUpdated,
            dataSource: stock.dataSource,
            history: oldStock?.history
              ? [
                  ...oldStock.history.slice(-49),
                  newPoint
                ]
              : [newPoint]
          };
        });

        return formattedStocks;
      });

      setMarketStatus("LIVE");
    } catch (error) {
      console.error("Stock fetch error:", error);

      setMarketStatus("ERROR");

      showMessage(
        "Unable to connect to the stock API.",
        "error"
      );
    }
  }, [showMessage]);

  const fetchPortfolio = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/portfolio/${USER_ID}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch portfolio");
      }

      const data = await response.json();

      setPortfolio(data);
    } catch (error) {
      console.error(
        "Portfolio fetch error:",
        error
      );
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/${USER_ID}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch transactions"
        );
      }

      const data = await response.json();

      setTransactions(data);
    } catch (error) {
      console.error(
        "Transaction fetch error:",
        error
      );
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      await Promise.all([
        fetchStocks(),
        fetchPortfolio(),
        fetchTransactions()
      ]);

      setLoading(false);
    };

    loadData();
  }, [
    fetchStocks,
    fetchPortfolio,
    fetchTransactions
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStocks();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchStocks]);

  const refresh = async () => {
    if (updating) return;

    setUpdating(true);
    setMarketStatus("UPDATING");

    await fetchStocks();

    setUpdating(false);

    showMessage(
      "Stock data refreshed successfully."
    );
  };

  const addToWatchlist = (symbol) => {
    setWatchlist((previous) => {
      if (previous.includes(symbol)) {
        return previous;
      }

      return [...previous, symbol];
    });
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist((previous) =>
      previous.filter(
        (item) => item !== symbol
      )
    );
  };

  const buyStock = async (
    symbol,
    quantity
  ) => {
    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      showMessage(
        "Enter a valid quantity.",
        "error"
      );
      return;
    }

    setTradeLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/buy`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            userId: USER_ID,
            symbol,
            quantity: amount
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Purchase failed"
        );
      }

      if (data.portfolio) {
        setPortfolio(
          data.portfolio
        );
      } else {
        await fetchPortfolio();
      }

      await fetchTransactions();

      showMessage(
        `Successfully bought ${amount} ${symbol} share(s).`
      );

      setSelectedStock(null);
    } catch (error) {
      console.error(
        "BUY error:",
        error
      );

      showMessage(
        error.message ||
          "Unable to buy stock.",
        "error"
      );
    } finally {
      setTradeLoading(false);
    }
  };

  const sellStock = async (
    symbol,
    quantity
  ) => {
    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      showMessage(
        "Enter a valid quantity.",
        "error"
      );
      return;
    }

    setTradeLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/sell`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            userId: USER_ID,
            symbol,
            quantity: amount
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Sale failed"
        );
      }

      if (data.portfolio) {
        setPortfolio(
          data.portfolio
        );
      } else {
        await fetchPortfolio();
      }

      await fetchTransactions();

      showMessage(
        `Successfully sold ${amount} ${symbol} share(s).`
      );

      setSelectedStock(null);
    } catch (error) {
      console.error(
        "SELL error:",
        error
      );

      showMessage(
        error.message ||
          "Unable to sell stock.",
        "error"
      );
    } finally {
      setTradeLoading(false);
    }
  };

  const filteredStocks = useMemo(() => {
    let list = Object.entries(stocks);

    const search =
      filters.search
        .toLowerCase()
        .trim();

    if (search) {
      list = list.filter(
        ([symbol, stock]) =>
          stock.name
            .toLowerCase()
            .includes(search) ||
          symbol
            .toLowerCase()
            .includes(search) ||
          stock.sector
            .toLowerCase()
            .includes(search)
      );
    }

    if (filters.sector) {
      list = list.filter(
        ([, stock]) =>
          stock.sector ===
          filters.sector
      );
    }

    if (filters.cap) {
      list = list.filter(
        ([, stock]) => {
          const cap =
            Number(
              stock.marketCap || 0
            );

          if (
            filters.cap ===
            "large"
          ) {
            return (
              cap >=
              500000000000
            );
          }

          if (
            filters.cap ===
            "mid"
          ) {
            return (
              cap >=
                50000000000 &&
              cap <
                500000000000
            );
          }

          return (
            cap <
            50000000000
          );
        }
      );
    }

    return list;
  }, [stocks, filters]);

  const sectors = useMemo(() => {
    return [
      ...new Set(
        Object.values(stocks).map(
          (stock) =>
            stock.sector
        )
      )
    ];
  }, [stocks]);

  const stats = useMemo(() => {
    const values =
      Object.values(stocks);

    const total =
      values.length;

    const gainers =
      values.filter(
        (stock) =>
          stock.change > 0
      ).length;

    const losers =
      values.filter(
        (stock) =>
          stock.change < 0
      ).length;

    const averageVolume =
      total > 0
        ? values.reduce(
            (
              sum,
              stock
            ) =>
              sum +
              Number(
                stock.volume || 0
              ),
            0
          ) /
          total /
          1000000
        : 0;

    return {
      total,
      gainers,
      losers,
      avgVol:
        averageVolume.toFixed(1)
    };
  }, [stocks]);

  const portfolioValue =
    useMemo(() => {
      return (
        portfolio.holdings || []
      ).reduce(
        (
          total,
          holding
        ) => {
          const stock =
            stocks[
              holding.symbol
            ];

          if (!stock) {
            return total;
          }

          return (
            total +
            stock.price *
              holding.quantity
          );
        },
        0
      );
    }, [
      portfolio,
      stocks
    ]);

  const totalPortfolioValue =
    Number(
      portfolio.cashBalance || 0
    ) + portfolioValue;

  const exportData = () => {
    const rows = [
      [
        "Company",
        "Symbol",
        "Sector",
        "Price",
        "Change",
        "Change %",
        "Volume",
        "Market Cap",
        "Exchange"
      ]
    ];

    Object.values(stocks).forEach(
      (stock) => {
        rows.push([
          stock.name,
          stock.symbol,
          stock.sector,
          stock.price.toFixed(2),
          stock.change.toFixed(2),
          stock.changePercent,
          stock.volume,
          stock.marketCap,
          stock.exchange
        ]);
      }
    );

    const csv =
      rows
        .map((row) =>
          row
            .map(
              (value) =>
                `"${String(
                  value
                ).replaceAll(
                  '"',
                  '""'
                )}"`
            )
            .join(",")
        )
        .join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `equityx-data-${
        new Date()
          .toISOString()
          .split("T")[0]
      }.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);
  };

  const latestUpdate =
    useMemo(() => {
      const values =
        Object.values(stocks);

      if (!values.length) {
        return null;
      }

      return values[0].lastUpdated;
    }, [stocks]);

  return (
    <div className="dashboard">

      {message && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "25px",
            zIndex: 99999,
            padding:
              "14px 20px",
            borderRadius: "8px",
            background:
              messageType ===
              "error"
                ? "#ef4444"
                : "#10b981",
            color: "#ffffff",
            fontWeight: "600",
            boxShadow:
              "0 10px 30px rgba(0,0,0,.3)"
          }}
        >
          <i
            className={`fas ${
              messageType ===
              "error"
                ? "fa-exclamation-circle"
                : "fa-check-circle"
            }`}
            style={{
              marginRight: "8px"
            }}
          />

          {message}
        </div>
      )}

      <nav className="topbar">
        <div className="nav-content">

          <div className="brand">

            <i className="fas fa-chart-line brand-icon" />

            <span className="brand-text">
              Equity
            </span>

            <span className="brand-accent">
              X
            </span>

          </div>

          <div className="nav-controls">

            <div className="market-status">

              <div
                className={`status-dot ${
                  marketStatus ===
                  "ERROR"
                    ? ""
                    : "active"
                }`}
              />

              <span>
                {marketStatus}
              </span>

            </div>

            <button
              className="btn-icon"
              onClick={refresh}
              disabled={updating}
              title="Refresh stocks"
            >
              <i
                className={`fas ${
                  updating
                    ? "fa-spinner fa-spin"
                    : "fa-sync-alt"
                }`}
              />
            </button>

            <button
              className="btn-icon"
              onClick={() => {
                const nextTheme =
                  theme === "dark"
                    ? "light"
                    : "dark";

                setTheme(
                  nextTheme
                );

                localStorage.setItem(
                  "theme",
                  nextTheme
                );
              }}
              title="Toggle theme"
            >
              <i
                className={`fas ${
                  theme === "light"
                    ? "fa-moon"
                    : "fa-sun"
                }`}
              />
            </button>

          </div>

        </div>
      </nav>

      <div
        style={{
          padding: "10px 25px",
          background:
            "rgba(16,185,129,0.08)",
          borderBottom:
            "1px solid rgba(16,185,129,0.15)",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap"
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >

          <span
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background:
                marketStatus ===
                "ERROR"
                  ? "#ef4444"
                  : "#10b981",
              display:
                "inline-block"
            }}
          />

          <strong>
            {marketStatus ===
            "ERROR"
              ? "MARKET DATA ERROR"
              : "LIVE MARKET DATA"}
          </strong>

          <span
            style={{
              color:
                "var(--text-secondary)"
            }}
          >
            • Updates every 30 seconds
          </span>

        </div>

        {latestUpdate && (
          <span
            style={{
              color:
                "var(--text-secondary)",
              fontSize: "13px"
            }}
          >
            Last update:{" "}
            {new Date(
              latestUpdate
            ).toLocaleTimeString()}
          </span>
        )}

      </div>

      <div className="market-strip">

        <div className="market-ticker">

          {marketIndices.map(
            (index) => (
              <div
                className="ticker-item"
                key={index.name}
              >

                <span className="ticker-name">
                  {index.name}
                </span>

                <span className="ticker-price">
                  {index.value.toLocaleString()}
                </span>

                <span
                  className={`ticker-change ${
                    index.change >=
                    0
                      ? "positive"
                      : "negative"
                  }`}
                >
                  {index.change >=
                  0
                    ? "▲"
                    : "▼"}{" "}
                  {Math.abs(
                    index.change
                  )}
                </span>

              </div>
            )
          )}

        </div>
      </div>

      <div className="main-grid">

        <aside className="sidebar">

          <div className="panel watchlist-panel">

            <div className="panel-header">

              <h3>
                <i className="fas fa-star" />{" "}
                Watchlist
              </h3>

              <span className="value-badge">
                ₹
                {watchlist
                  .reduce(
                    (
                      sum,
                      symbol
                    ) =>
                      sum +
                      (
                        stocks[
                          symbol
                        ]?.price ||
                        0
                      ),
                    0
                  )
                  .toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits:
                        0
                    }
                  )}
              </span>

            </div>

            <div className="panel-body">

              <div className="watchlist-items">

                {watchlist.length ===
                0 ? (

                  <div className="empty-state">

                    <i className="fas fa-star" />

                    <p>
                      Your watchlist is empty
                    </p>

                  </div>

                ) : (

                  watchlist.map(
                    (symbol) => {
                      const stock =
                        stocks[
                          symbol
                        ];

                      if (!stock) {
                        return null;
                      }

                      return (
                        <div
                          className="watchlist-item"
                          key={symbol}
                          onClick={() =>
                            setSelectedStock(
                              symbol
                            )
                          }
                        >

                          <div className="stock-info">

                            <h4>
                              {stock.name}
                            </h4>

                            <div className="stock-meta">
                              {stock.symbol} •{" "}
                              {stock.sector}
                            </div>

                          </div>

                          <div className="stock-data">

                            <div className="stock-price">
                              ₹
                              {stock.price.toFixed(
                                2
                              )}
                            </div>

                            <div
                              className={`stock-change ${
                                stock.change >=
                                0
                                  ? "positive"
                                  : "negative"
                              }`}
                            >
                              {stock.change >=
                              0
                                ? "+"
                                : ""}
                              {stock.change.toFixed(
                                2
                              )}
                            </div>

                          </div>

                          <button
                            className="btn-remove"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              removeFromWatchlist(
                                symbol
                              );
                            }}
                          >
                            <i className="fas fa-times" />
                          </button>

                        </div>
                      );
                    }
                  )

                )}

              </div>
            </div>
          </div>

          <div className="panel search-panel">

            <div className="panel-header">

              <h3>
                <i className="fas fa-search" />{" "}
                Search
              </h3>

            </div>

            <div className="panel-body">

              <div className="search-container">

                <input
                  value={
                    filters.search
                  }
                  onChange={(
                    event
                  ) =>
                    setFilters(
                      (
                        previous
                      ) => ({
                        ...previous,
                        search:
                          event.target
                            .value
                      })
                    )
                  }
                  placeholder="Search stocks..."
                  className="search-input"
                />

                <i className="fas fa-search search-icon" />

              </div>

              <div className="filters">

                <select
                  value={
                    filters.sector
                  }
                  onChange={(
                    event
                  ) =>
                    setFilters(
                      (
                        previous
                      ) => ({
                        ...previous,
                        sector:
                          event.target
                            .value
                      })
                    )
                  }
                  className="filter-select"
                >

                  <option value="">
                    All Sectors
                  </option>

                  {sectors.map(
                    (sector) => (
                      <option
                        key={sector}
                        value={sector}
                      >
                        {sector}
                      </option>
                    )
                  )}

                </select>

                <select
                  value={
                    filters.cap
                  }
                  onChange={(
                    event
                  ) =>
                    setFilters(
                      (
                        previous
                      ) => ({
                        ...previous,
                        cap:
                          event.target
                            .value
                      })
                    )
                  }
                  className="filter-select"
                >

                  <option value="">
                    All Cap
                  </option>

                  <option value="large">
                    Large Cap
                  </option>

                  <option value="mid">
                    Mid Cap
                  </option>

                  <option value="small">
                    Small Cap
                  </option>

                </select>

              </div>
            </div>
          </div>

          <div className="panel">

            <div className="panel-header">

              <h3>
                <i className="fas fa-wallet" />{" "}
                Portfolio
              </h3>

            </div>

            <div className="panel-body">

              <div
                style={{
                  display: "grid",
                  gap: "12px"
                }}
              >

                <div>

                  <small>
                    Cash Balance
                  </small>

                  <h3>
                    ₹
                    {Number(
                      portfolio.cashBalance ||
                        0
                    ).toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits:
                          2
                      }
                    )}
                  </h3>

                </div>

                <div>

                  <small>
                    Holdings Value
                  </small>

                  <h3>
                    ₹
                    {portfolioValue.toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits:
                          2
                      }
                    )}
                  </h3>

                </div>

                <div>

                  <small>
                    Total Portfolio
                  </small>

                  <h3>
                    ₹
                    {totalPortfolioValue.toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits:
                          2
                      }
                    )}
                  </h3>

                </div>

              </div>

            </div>
          </div>

          <div className="panel stats-panel">

            <div className="panel-header">

              <h3>
                <i className="fas fa-chart-pie" />{" "}
                Stats
              </h3>

            </div>

            <div className="panel-body">

              <div className="stats-grid">

                <div className="stat-item">

                  <div className="stat-value">
                    {stats.total}
                  </div>

                  <div className="stat-label">
                    Total
                  </div>

                </div>

                <div className="stat-item gain">

                  <div className="stat-value">
                    {stats.gainers}
                  </div>

                  <div className="stat-label">
                    Gainers
                  </div>

                </div>

                <div className="stat-item">

                  <div className="stat-value">
                    {stats.losers}
                  </div>

                  <div className="stat-label">
                    Losers
                  </div>

                </div>

                <div className="stat-item">

                  <div className="stat-value">
                    {stats.avgVol}M
                  </div>

                  <div className="stat-label">
                    Avg Volume
                  </div>

                </div>

              </div>
            </div>
          </div>

        </aside>

        <main className="content">

          <div className="content-header">

            <div>

              <h1>
                EquityX Stock Market Dashboard
              </h1>

              <p>
                Real-time external market data
              </p>

            </div>

            <div
              style={{
                display: "flex",
                gap: "10px"
              }}
            >

              <button
                className="btn-secondary"
                onClick={exportData}
              >
                <i className="fas fa-download" />{" "}
                Download
              </button>

              <button
                className="btn-primary"
                onClick={refresh}
                disabled={updating}
              >
                <i
                  className={`fas ${
                    updating
                      ? "fa-spinner fa-spin"
                      : "fa-sync-alt"
                  }`}
                />{" "}
                Refresh
              </button>

            </div>

          </div>

          {loading && (

            <div
              className="panel"
              style={{
                padding: "40px",
                textAlign: "center"
              }}
            >

              <i className="fas fa-spinner fa-spin" />{" "}
              Loading live market data...

            </div>

          )}

          {!loading && (

            <div className="panel">

              <div className="panel-header">

                <h3>
                  <i className="fas fa-list" />{" "}
                  Stock Listings
                </h3>

                <span className="value-badge">
                  {filteredStocks.length} Stocks
                </span>

              </div>

              <div
                className="panel-body"
                style={{
                  overflowX: "auto"
                }}
              >

                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse"
                  }}
                >

                  <thead>

                    <tr>
                      <th>Stock</th>
                      <th>Price</th>
                      <th>Change</th>
                      <th>Change %</th>
                      <th>Volume</th>
                      <th>Market Cap</th>
                      <th>Action</th>
                    </tr>

                  </thead>

                  <tbody>

                    {filteredStocks.map(
                      ([
                        symbol,
                        stock
                      ]) => (

                        <tr
                          key={symbol}
                          style={{
                            borderBottom:
                              "1px solid var(--border-color)"
                          }}
                        >

                          <td
                            style={{
                              padding:
                                "14px 8px"
                            }}
                          >

                            <strong>
                              {stock.name}
                            </strong>

                            <div
                              style={{
                                fontSize:
                                  "12px",
                                color:
                                  "var(--text-secondary)"
                              }}
                            >
                              {stock.symbol} •{" "}
                              {stock.exchange}
                            </div>

                          </td>

                          <td>

                            <strong>
                              ₹
                              {stock.price.toFixed(
                                2
                              )}
                            </strong>

                          </td>

                          <td
                            className={
                              stock.change >=
                              0
                                ? "positive"
                                : "negative"
                            }
                          >
                            {stock.change >=
                            0
                              ? "+"
                              : ""}
                            {stock.change.toFixed(
                              2
                            )}
                          </td>

                          <td
                            className={
                              stock.changePercent >=
                              0
                                ? "positive"
                                : "negative"
                            }
                          >
                            {stock.changePercent >=
                            0
                              ? "+"
                              : ""}
                            {Number(
                              stock.changePercent
                            ).toFixed(2)}
                            %
                          </td>

                          <td>
                            {Number(
                              stock.volume
                            ).toLocaleString()}
                          </td>

                          <td>
                            {formatMarketCap(
                              stock.marketCap
                            )}
                          </td>

                          <td>

                            <button
                              className="btn-primary"
                              onClick={() =>
                                setSelectedStock(
                                  symbol
                                )
                              }
                            >
                              Trade
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

                {!filteredStocks.length && (

                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center"
                    }}
                  >
                    No stocks found.
                  </div>

                )}

              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(280px,1fr))",
              gap: "20px",
              marginTop: "20px"
            }}
          >

            {watchlist.map(
              (symbol) => {

                const stock =
                  stocks[symbol];

                if (!stock) {
                  return null;
                }

                return (
                  <StockChart
                    key={symbol}
                    stock={stock}
                  />
                );
              }
            )}

          </div>

          <div
            className="panel"
            style={{
              marginTop: "20px"
            }}
          >

            <div className="panel-header">

              <h3>
                <i className="fas fa-history" />{" "}
                Transaction History
              </h3>

            </div>

            <div
              className="panel-body"
              style={{
                overflowX: "auto"
              }}
            >

              {!transactions.length ? (

                <div
                  style={{
                    padding: "25px",
                    textAlign: "center",
                    color:
                      "var(--text-secondary)"
                  }}
                >
                  No transactions yet.
                </div>

              ) : (

                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse"
                  }}
                >

                  <thead>

                    <tr>
                      <th>Type</th>
                      <th>Symbol</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                      <th>Date</th>
                    </tr>

                  </thead>

                  <tbody>

                    {transactions
                      .slice()
                      .reverse()
                      .map(
                        (
                          transaction,
                          index
                        ) => (

                          <tr
                            key={
                              transaction._id ||
                              index
                            }
                          >

                            <td
                              className={
                                transaction.type?.toUpperCase() ===
                                "BUY"
                                  ? "positive"
                                  : "negative"
                              }
                            >
                              {transaction.type}
                            </td>

                            <td>
                              {transaction.symbol}
                            </td>

                            <td>
                              {transaction.quantity}
                            </td>

                            <td>
                              ₹
                              {Number(
                                transaction.price ||
                                  0
                              ).toFixed(2)}
                            </td>

                            <td>
                              ₹
                              {Number(
                                transaction.totalAmount ||
                                  transaction.total ||
                                  0
                              ).toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits:
                                    2
                                }
                              )}
                            </td>

                            <td>
                              {transaction.createdAt
                                ? new Date(
                                    transaction.createdAt
                                  ).toLocaleString()
                                : "-"}
                            </td>

                          </tr>

                        )
                      )}

                  </tbody>

                </table>

              )}

            </div>
          </div>

        </main>
      </div>

      {selectedStock &&
        stocks[selectedStock] && (

          <TradeModal
            stock={
              stocks[selectedStock]
            }

            onClose={() =>
              setSelectedStock(null)
            }

            onBuy={buyStock}

            onSell={sellStock}

            loading={
              tradeLoading
            }

            isInWatchlist={
              watchlist.includes(
                selectedStock
              )
            }

            onAddWatchlist={() =>
              addToWatchlist(
                selectedStock
              )
            }

            onRemoveWatchlist={() =>
              removeFromWatchlist(
                selectedStock
              )
            }
          />

        )}

    </div>
  );
}

function StockChart({ stock }) {
  const canvasRef =
    useRef(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const ctx =
      canvasRef.current.getContext(
        "2d"
      );

    const history =
      stock.history?.length
        ? stock.history
        : [
            {
              time:
                new Date().toLocaleTimeString(),
              price:
                stock.price
            }
          ];

    const color =
      stock.change >= 0
        ? "#10b981"
        : "#ef4444";

    const chart =
      new Chart(ctx, {
        type: "line",

        data: {
          labels:
            history.map(
              (item) =>
                item.time
            ),

          datasets: [
            {
              label:
                `${stock.symbol} Price`,

              data:
                history.map(
                  (item) =>
                    item.price
                ),

              borderColor:
                color,

              backgroundColor:
                `${color}20`,

              borderWidth: 2,

              fill: true,

              tension: 0.4,

              pointRadius: 2
            }
          ]
        },

        options: {
          responsive: true,

          maintainAspectRatio:
            false,

          plugins: {
            legend: {
              display: false
            },

            tooltip: {
              callbacks: {
                label: (
                  item
                ) =>
                  `₹${Number(
                    item.parsed.y
                  ).toFixed(2)}`
              }
            }
          },

          scales: {
            x: {
              display: false
            },

            y: {
              beginAtZero: false
            }
          }
        }
      });

    return () => {
      chart.destroy();
    };
  }, [stock]);

  return (
    <div className="panel">

      <div className="panel-header">

        <div>

          <h3>
            {stock.symbol}
          </h3>

          <span
            style={{
              fontSize: "12px",
              color:
                "var(--text-secondary)"
            }}
          >
            {stock.name}
          </span>

        </div>

        <div
          className={
            stock.change >= 0
              ? "positive"
              : "negative"
          }
        >
          ₹
          {stock.price.toFixed(
            2
          )}
        </div>

      </div>

      <div
        className="panel-body"
        style={{
          height: "220px"
        }}
      >

        <canvas
          ref={canvasRef}
        />

      </div>

    </div>
  );
}

function TradeModal({
  stock,
  onClose,
  onBuy,
  onSell,
  loading,
  isInWatchlist,
  onAddWatchlist,
  onRemoveWatchlist
}) {
  const [quantity, setQuantity] =
    useState(1);

  const [action, setAction] =
    useState("BUY");

  const total =
    stock.price *
    Number(
      quantity || 0
    );

  const submit = () => {
    if (action === "BUY") {
      onBuy(
        stock.symbol,
        quantity
      );
    } else {
      onSell(
        stock.symbol,
        quantity
      );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(0,0,0,.7)",
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        zIndex: 100000,
        padding: "20px"
      }}
      onClick={onClose}
    >

      <div
        className="panel"
        style={{
          width: "100%",
          maxWidth: "500px"
        }}
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="panel-header">

          <div>

            <h3>
              {stock.name}
            </h3>

            <span
              style={{
                color:
                  "var(--text-secondary)"
              }}
            >
              {stock.symbol} •{" "}
              {stock.exchange}
            </span>

          </div>

          <button
            className="btn-icon"
            onClick={onClose}
          >
            <i className="fas fa-times" />
          </button>

        </div>

        <div className="panel-body">

          <div
            style={{
              textAlign:
                "center",
              marginBottom:
                "25px"
            }}
          >

            <div
              style={{
                fontSize:
                  "32px",
                fontWeight:
                  "700"
              }}
            >
              ₹
              {stock.price.toFixed(
                2
              )}
            </div>

            <div
              className={
                stock.change >=
                0
                  ? "positive"
                  : "negative"
              }
            >
              {stock.change >=
              0
                ? "+"
                : ""}
              {stock.change.toFixed(
                2
              )}{" "}
              (
              {stock.changePercent >=
              0
                ? "+"
                : ""}
              {Number(
                stock.changePercent
              ).toFixed(2)}
              %)
            </div>

          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom:
                "20px"
            }}
          >

            <button
              className="btn-primary"
              style={{
                flex: 1
              }}
              onClick={() =>
                setAction(
                  "BUY"
                )
              }
            >
              BUY
            </button>

            <button
              className="btn-secondary"
              style={{
                flex: 1
              }}
              onClick={() =>
                setAction(
                  "SELL"
                )
              }
            >
              SELL
            </button>

          </div>

          <label>
            Quantity
          </label>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(
              event
            ) =>
              setQuantity(
                event.target.value
              )
            }
            style={{
              width:
                "100%",
              padding:
                "12px",
              marginTop:
                "8px",
              marginBottom:
                "15px",
              borderRadius:
                "6px",
              border:
                "1px solid var(--border-color)",
              background:
                "var(--bg-secondary)",
              color:
                "var(--text-primary)"
            }}
          />

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              marginBottom:
                "20px"
            }}
          >

            <span>
              Estimated Total
            </span>

            <strong>
              ₹
              {total.toLocaleString(
                undefined,
                {
                  maximumFractionDigits:
                    2
                }
              )}
            </strong>

          </div>

          <button
            className="btn-primary"
            style={{
              width:
                "100%",
              marginBottom:
                "10px"
            }}
            onClick={submit}
            disabled={loading}
          >

            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin" />{" "}
                Processing...
              </>
            ) : (
              <>
                <i
                  className={`fas ${
                    action ===
                    "BUY"
                      ? "fa-shopping-cart"
                      : "fa-arrow-up"
                  }`}
                />{" "}
                Confirm{" "}
                {action}
              </>
            )}

          </button>

          <button
            className="btn-secondary"
            style={{
              width:
                "100%"
            }}
            onClick={
              isInWatchlist
                ? onRemoveWatchlist
                : onAddWatchlist
            }
          >

            <i className="fas fa-star" />{" "}

            {isInWatchlist
              ? "Remove from Watchlist"
              : "Add to Watchlist"}

          </button>

        </div>
      </div>
    </div>
  );
}

function formatMarketCap(value) {
  const number =
    Number(value || 0);

  if (
    number >=
    1000000000000
  ) {
    return (
      "₹" +
      (
        number /
        1000000000000
      ).toFixed(2) +
      "T"
    );
  }

  if (
    number >=
    1000000000
  ) {
    return (
      "₹" +
      (
        number /
        1000000000
      ).toFixed(2) +
      "B"
    );
  }

  if (
    number >=
    1000000
  ) {
    return (
      "₹" +
      (
        number /
        1000000
      ).toFixed(2) +
      "M"
    );
  }

  return (
    "₹" +
    number.toLocaleString()
  );
}

export default App;