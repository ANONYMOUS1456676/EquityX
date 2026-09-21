const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Stock = require("./models/Stock");

dotenv.config();

const stocks = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    price: 2925.50,
    change: 35.20,
    changePercent: 1.22,
    volume: 4523100,
    marketCap: 1985000000000,
    sector: "Energy",
    exchange: "NSE"
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    price: 4240.75,
    change: -28.45,
    changePercent: -0.67,
    volume: 1845200,
    marketCap: 1532000000000,
    sector: "IT",
    exchange: "NSE"
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    price: 1745.30,
    change: 12.80,
    changePercent: 0.74,
    volume: 3267400,
    marketCap: 1338000000000,
    sector: "Banking",
    exchange: "NSE"
  },
  {
    symbol: "INFY",
    name: "Infosys",
    price: 1852.60,
    change: 18.40,
    changePercent: 1.00,
    volume: 2986100,
    marketCap: 768000000000,
    sector: "IT",
    exchange: "NSE"
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank",
    price: 1398.25,
    change: -8.15,
    changePercent: -0.58,
    volume: 3754200,
    marketCap: 985000000000,
    sector: "Banking",
    exchange: "NSE"
  },
  {
    symbol: "BHARTIARTL",
    name: "Bharti Airtel",
    price: 1945.80,
    change: 22.65,
    changePercent: 1.18,
    volume: 2215800,
    marketCap: 1215000000000,
    sector: "Telecom",
    exchange: "NSE"
  },
  {
    symbol: "ITC",
    name: "ITC Limited",
    price: 421.35,
    change: 3.25,
    changePercent: 0.78,
    volume: 5823400,
    marketCap: 528000000000,
    sector: "FMCG",
    exchange: "NSE"
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    price: 812.40,
    change: -4.35,
    changePercent: -0.53,
    volume: 6342100,
    marketCap: 725000000000,
    sector: "Banking",
    exchange: "NSE"
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

    await Stock.deleteMany();

    await Stock.insertMany(stocks);

    console.log(`${stocks.length} stocks inserted successfully`);

    await mongoose.connection.close();

    console.log("Database connection closed");
  } catch (error) {
    console.error("Seed Error:", error.message);
    process.exit(1);
  }
};

seedDatabase();