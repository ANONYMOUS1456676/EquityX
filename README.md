# TechStock Pro — ReactJS Conversion

This is the original TechStock Pro stock-market dashboard converted from vanilla HTML/CSS/JavaScript + jQuery into ReactJS.

## Stack
- React 18
- Chart.js 4
- HTML/CSS/JavaScript
- Font Awesome
- Optional Alpha Vantage API
- localStorage for demo/cache data

## Run locally

1. Open this folder in VS Code.
2. Open a terminal:
   ```bash
   npm install
   npm start
   ```
3. The app opens at `http://localhost:3000`.

## Optional live stock API

Create a `.env` file in the project root:

```env
REACT_APP_ALPHA_VANTAGE_API_KEY=YOUR_API_KEY
```

Restart `npm start` after changing `.env`.

If no API key is configured, the dashboard automatically uses simulated/demo updates, so the UI still works locally.

## React structure

- `src/App.js` — dashboard UI, state, filters, watchlist, modal, export
- `src/data.js` — company data, market indices, demo history, API update helpers
- `src/index.js` — React entry point
- `src/*.css` — converted original styling and animations
- `public/index.html` — React HTML shell

## Converted functionality

- Watchlist add/remove
- Stock search
- Sector and market-cap filters
- Line / area / bar charts
- Stock detail modal with chart
- Theme toggle
- Refresh/update state
- CSV export
- localStorage cache
- Responsive layout
- Optional Alpha Vantage integration
