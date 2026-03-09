# ⚡ SIGMAEDGE — Market Intelligence Platform

> **An AI-powered, all-in-one trading intelligence dashboard** that analyses option chain data, volume, market sentiment, and global macroeconomic signals to predict buy/sell triggers and stock movement directions.

---

## 📌 Overview

SIGMAEDGE is a React-based front-end platform built for traders and analysts who want a single unified view of:

- Real-time stock price feeds
- Option chain analysis (OI, Volume, IV, LTP)
- AI-generated buy/sell/wait signals with confidence scoring
- Global macro signals (Crude, Gold, DXY, VIX, FII flows)
- Sector heatmaps and market breadth
- Predictive price targets with stop-loss levels

> ⚠️ **Disclaimer:** All data in the current build is **simulated** for educational and demonstration purposes. This is **not financial advice**. Consult a SEBI-registered investment advisor before making any trading decisions.

---

## 🧠 Core Features

### 1. 📡 Live Price Ticker
- Auto-updating price feed for 8 symbols (NIFTY, BANKNIFTY, RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, WIPRO)
- Displays live price and percentage change
- Marquee-style scrolling ticker bar at the top

### 2. 🌐 Global Signals Sidebar
Tracks 8 key macroeconomic signals updated every 2 seconds:

| Signal | Description |
|---|---|
| US Fed Rate | Current federal funds rate |
| Crude Oil (WTI) | Oil price — impacts OMCs, airlines, paint stocks |
| Gold (oz) | Safe-haven demand indicator |
| DXY Index | US Dollar strength vs basket of currencies |
| US 10Y Yield | Bond market risk sentiment proxy |
| VIX (India) | India volatility index — fear gauge |
| SGX Nifty | Pre-market Nifty direction indicator |
| USD/INR | Rupee strength — FII flow proxy |

### 3. 🤖 AI Signal Engine
The core intelligence layer that computes signals from:
- **Put-Call Ratio (PCR)** — derived from total Call OI vs Put OI
- **IV Skew** — difference between Put IV and Call IV across strikes
- **Volume Surges** — strikes where volume exceeds 40% of OI
- **Max Pain analysis** — strike with highest total OI (resistance/support)
- **Momentum scoring** — composite directional bias score

**Outputs:**
- `BUY` / `SELL` / `WAIT` action signal
- `BULLISH` / `BEARISH` / `NEUTRAL` bias
- `STRONG` / `MODERATE` / `WEAK` signal strength
- Confidence % score (0–100)

### 4. 📊 4-Tab Analysis Interface

#### Tab 1 — Overview
- Key price levels: Target 1, Target 2, Stop Loss, Resistance, Support
- OI Summary: Total Call OI, Total Put OI, PCR gauge
- AI Confidence Meter (arc gauge visual)
- Global Macro Impact grid: FII/DII flow, Crude, USD/INR, US Markets

#### Tab 2 — Option Chain
Full strike-wise option chain table with:
- Call Side: OI, Volume, IV%, LTP, Change%
- Put Side: OI, Volume, IV%, LTP, Change%
- ATM strike highlighted in amber
- Max Call OI strike (Resistance) highlighted in green
- Max Put OI strike (Support) highlighted in red
- Visual OI bars scaled to open interest size

#### Tab 3 — Sentiment
- Sentiment breakdown bars (Options, Volume Momentum, IV Skew, FII, Global Macro, Retail)
- Market breadth: Advances / Declines / Unchanged counts
- Call vs Put Volume Surge comparison
- Sector Heatmap (12 sectors with colour intensity by % change)

#### Tab 4 — Predictions
- Price prediction box: Current price → Target range
- Target 1, Target 2 with probability estimates
- Stop Loss level
- 5-factor Signal Reasoning panel:
  1. PCR Analysis
  2. Max Pain / Key Strikes
  3. IV Skew interpretation
  4. Global Macro cues
  5. Volume Surge analysis
- Weekly Outlook table: 8-stock prediction grid with confidence scores

---

## 🗂 File Structure

```
sigmaedge/
├── market-intelligence.jsx   # Main React component (single-file app)
└── README.md                 # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A React environment (Vite, Create React App, or Claude.ai Artifacts)

### Run in Claude.ai
Simply paste `market-intelligence.jsx` into a Claude.ai Artifact (React type) — it runs instantly with no dependencies beyond React and Tailwind.

### Run Locally with Vite

```bash
# 1. Create a new Vite + React project
npm create vite@latest sigmaedge -- --template react
cd sigmaedge

# 2. Replace src/App.jsx with market-intelligence.jsx content

# 3. Install and run
npm install
npm run dev
```

### Dependencies Used
All resolved via CDN in the Artifact environment — no npm install needed for Artifact mode:

| Library | Version | Usage |
|---|---|---|
| React | 18+ | UI framework |
| Tailwind CSS | Core utilities | Styling (via CDN) |
| JetBrains Mono | Google Fonts | Monospace data font |
| Syne | Google Fonts | Display/heading font |

---

## 🧩 Architecture

```
App (Root)
├── State Management (useState, useEffect, useCallback)
│   ├── selectedStock       — Active stock for analysis
│   ├── chain               — Generated option chain data
│   ├── signals             — AI-computed signal output
│   ├── prices              — Live-updating price feeds
│   └── tab                 — Active tab (overview/option chain/sentiment/predictions)
│
├── Data Layer
│   ├── STOCKS[]            — 8 stock definitions
│   ├── GLOBAL_SIGNALS[]    — 8 macro indicators
│   ├── NEWS_ITEMS[]        — Rotating news ticker strings
│   ├── generateOptionChain() — Synthetic OI/IV/LTP generator
│   └── computeSignals()    — AI signal computation engine
│
└── UI Components
    ├── Sparkline            — SVG mini price chart
    ├── GaugeArc             — SVG confidence meter arc
    └── Tab panels           — Overview / Option Chain / Sentiment / Predictions
```

---

## 📐 Signal Logic Reference

### PCR Interpretation
| PCR Value | Market Bias | Action |
|---|---|---|
| > 1.2 | Bullish | BUY |
| 0.8 – 1.2 | Neutral | WAIT |
| < 0.8 | Bearish | SELL |

### IV Skew
| Skew Direction | Meaning |
|---|---|
| Put IV > Call IV (positive) | Hedging demand — mild caution |
| Call IV > Put IV (negative) | Directional bullish bets active |

### Max Pain
- **Max Call OI Strike** → Acts as overhead resistance (market makers defend this level)
- **Max Put OI Strike** → Acts as downside support (put writers protect this level)

---

## 🔧 Customisation Guide

### Add a New Stock
In `STOCKS[]` array, add:
```javascript
{ sym: "TATAMOTORS", name: "Tata Motors Ltd", price: 960, sector: "Auto" }
```

### Change Refresh Rate
Find the `setInterval` in the live ticker `useEffect`:
```javascript
ticker.current = setInterval(() => { ... }, 2000); // change 2000ms to desired ms
```

### Connect Real Data
Replace `generateOptionChain()` and `computeSignals()` with API calls to:
- **NSE Option Chain API** — `https://www.nseindia.com/api/option-chain-indices`
- **Upstox / Zerodha Kite API** — For live price and OI feeds
- **Alpha Vantage / Polygon.io** — For global macro signals

Example integration stub:
```javascript
async function fetchRealChain(symbol) {
  const res = await fetch(`/api/option-chain?symbol=${symbol}`);
  const data = await res.json();
  return data.records.data.map(row => ({
    strike: row.strikePrice,
    call: { oi: row.CE?.openInterest, ltp: row.CE?.lastPrice, iv: row.CE?.impliedVolatility, ... },
    put:  { oi: row.PE?.openInterest, ltp: row.PE?.lastPrice, iv: row.PE?.impliedVolatility, ... },
  }));
}
```

---

## 🛡 Risk Disclaimer

This tool is for **educational and informational purposes only**.

- Past signal accuracy does not guarantee future performance
- Option trading involves substantial risk of loss
- Never trade based solely on algorithmic signals
- Always use proper position sizing and risk management
- Consult a SEBI-registered Research Analyst (RA) for personalised advice

---

## 📄 License

MIT License — free to use, modify, and distribute with attribution.

---

*Built with React · Styled with JetBrains Mono + Syne · Powered by simulated AI Signal Engine*
