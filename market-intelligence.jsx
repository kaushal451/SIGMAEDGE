import { useState, useEffect, useRef, useCallback } from "react";

// ── helpers ────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max));
const pick = (arr) => arr[randInt(0, arr.length)];
const fmt = (n, d = 2) => n.toFixed(d);
const fmtVol = (n) =>
  n >= 1e7 ? (n / 1e7).toFixed(2) + "Cr" : n >= 1e5 ? (n / 1e5).toFixed(2) + "L" : n.toLocaleString();

// ── static data ────────────────────────────────────────────────────────────
const STOCKS = [
  { sym: "NIFTY", name: "Nifty 50", price: 22380, sector: "Index" },
  { sym: "BANKNIFTY", name: "Bank Nifty", price: 47820, sector: "Index" },
  { sym: "RELIANCE", name: "Reliance Industries", price: 2934, sector: "Energy" },
  { sym: "TCS", name: "Tata Consultancy", price: 3812, sector: "IT" },
  { sym: "INFY", name: "Infosys Ltd", price: 1641, sector: "IT" },
  { sym: "HDFCBANK", name: "HDFC Bank", price: 1538, sector: "Banking" },
  { sym: "ICICIBANK", name: "ICICI Bank", price: 1143, sector: "Banking" },
  { sym: "WIPRO", name: "Wipro Ltd", price: 480, sector: "IT" },
];

const GLOBAL_SIGNALS = [
  { name: "US Fed Rate", value: "5.25%", trend: "neutral", icon: "🏦" },
  { name: "Crude Oil (WTI)", value: "$82.4", trend: "up", icon: "🛢" },
  { name: "Gold (oz)", value: "$2,318", trend: "up", icon: "🥇" },
  { name: "DXY Index", value: "104.3", trend: "down", icon: "💵" },
  { name: "US 10Y Yield", value: "4.41%", trend: "up", icon: "📈" },
  { name: "VIX (India)", value: "13.2", trend: "down", icon: "⚡" },
  { name: "SGX Nifty", value: "+0.32%", trend: "up", icon: "🌐" },
  { name: "USD/INR", value: "83.42", trend: "neutral", icon: "💱" },
];

const NEWS_ITEMS = [
  "FII net buyers at ₹2,340Cr; DII adds ₹1,890Cr — bullish institutional flow",
  "RBI holds repo rate steady at 6.5%; inflation within target band",
  "Q4 earnings season: IT majors beat estimates; margin expansion visible",
  "US jobs data beats forecast; recession fears ease, risk-on mood",
  "China PMI slips below 50; emerging market caution warranted",
  "SEBI new F&O rules effective April 2025; lot sizes revised",
  "Crude inventory draw sparks rally; OMC stocks under pressure",
  "Auto sector volumes surge 18% YoY; strong domestic demand persists",
];

// ── option chain generator ─────────────────────────────────────────────────
function generateOptionChain(basePrice) {
  const strikes = [];
  const atm = Math.round(basePrice / 50) * 50;
  for (let i = -6; i <= 6; i++) {
    const strike = atm + i * 50;
    const dist = Math.abs(i);
    const callOI = randInt(2000, 80000) * Math.exp(-dist * 0.4);
    const putOI = randInt(2000, 80000) * Math.exp(-dist * 0.4);
    const callVol = callOI * rand(0.1, 0.6);
    const putVol = putOI * rand(0.1, 0.6);
    const moneyness = (basePrice - strike) / basePrice;
    const callIV = rand(12, 18) + Math.max(0, -moneyness * 30);
    const putIV = rand(12, 18) + Math.max(0, moneyness * 30);
    const callPrice =
      i <= 0
        ? Math.max(basePrice - strike, 0) + rand(2, 40) * Math.exp(-dist * 0.5)
        : rand(2, 40) * Math.exp(-dist * 0.5);
    const putPrice =
      i >= 0
        ? Math.max(strike - basePrice, 0) + rand(2, 40) * Math.exp(-dist * 0.5)
        : rand(2, 40) * Math.exp(-dist * 0.5);

    strikes.push({
      strike,
      isATM: i === 0,
      call: {
        oi: Math.round(callOI),
        vol: Math.round(callVol),
        iv: fmt(callIV),
        ltp: fmt(callPrice),
        chg: fmt(rand(-15, 15)),
      },
      put: {
        oi: Math.round(putOI),
        vol: Math.round(putVol),
        iv: fmt(putIV),
        ltp: fmt(putPrice),
        chg: fmt(rand(-15, 15)),
      },
    });
  }
  return strikes;
}

// ── AI signal engine ───────────────────────────────────────────────────────
function computeSignals(stock, chain) {
  const totalCallOI = chain.reduce((s, r) => s + r.call.oi, 0);
  const totalPutOI = chain.reduce((s, r) => s + r.put.oi, 0);
  const pcr = totalPutOI / totalCallOI;

  const maxCallOI = chain.reduce((m, r) => (r.call.oi > m.oi ? { oi: r.call.oi, strike: r.strike } : m), { oi: 0, strike: 0 });
  const maxPutOI = chain.reduce((m, r) => (r.put.oi > m.oi ? { oi: r.put.oi, strike: r.strike } : m), { oi: 0, strike: 0 });

  const ivSkew = chain.reduce((s, r) => s + (parseFloat(r.put.iv) - parseFloat(r.call.iv)), 0) / chain.length;
  const callVolSurge = chain.filter((r) => r.call.vol > r.call.oi * 0.4).length;
  const putVolSurge = chain.filter((r) => r.put.vol > r.put.oi * 0.4).length;

  const momentumBull = rand(40, 85);
  const momentumBear = rand(15, 60);

  let bias, strength, action, confidence;

  if (pcr > 1.2 && momentumBull > 60) {
    bias = "BULLISH";
    strength = "STRONG";
    action = "BUY";
    confidence = rand(72, 91);
  } else if (pcr < 0.8 && momentumBear > 40) {
    bias = "BEARISH";
    strength = "MODERATE";
    action = "SELL";
    confidence = rand(65, 85);
  } else {
    bias = "NEUTRAL";
    strength = "WEAK";
    action = "WAIT";
    confidence = rand(45, 65);
  }

  const price = stock.price;
  const move = rand(0.8, 2.2);
  const target1 = bias === "BULLISH" ? price * (1 + move / 100) : price * (1 - move / 100);
  const target2 = bias === "BULLISH" ? price * (1 + (move * 1.8) / 100) : price * (1 - (move * 1.8) / 100);
  const sl = bias === "BULLISH" ? price * (1 - move * 0.6 / 100) : price * (1 + move * 0.6 / 100);

  return {
    pcr: fmt(pcr),
    resistance: maxCallOI.strike,
    support: maxPutOI.strike,
    ivSkew: fmt(ivSkew),
    callVolSurge,
    putVolSurge,
    bias,
    strength,
    action,
    confidence: fmt(confidence, 1),
    target1: fmt(target1, 0),
    target2: fmt(target2, 0),
    sl: fmt(sl, 0),
    totalCallOI: fmtVol(totalCallOI),
    totalPutOI: fmtVol(totalPutOI),
    sentimentScore: fmt(pcr > 1 ? rand(55, 80) : rand(30, 55), 0),
  };
}

// ── sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  const w = 80, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── gauge arc ──────────────────────────────────────────────────────────────
function GaugeArc({ value, max = 100, color, size = 80 }) {
  const r = size / 2 - 6;
  const c = size / 2;
  const pct = value / max;
  const startAngle = Math.PI;
  const endAngle = Math.PI + Math.PI * pct;
  const x1 = c + r * Math.cos(startAngle), y1 = c + r * Math.sin(startAngle);
  const x2 = c + r * Math.cos(endAngle), y2 = c + r * Math.sin(endAngle);
  const large = pct > 0.5 ? 1 : 0;
  return (
    <svg width={size} height={size / 2 + 8} style={{ display: "block" }}>
      <path d={`M ${x1} ${y1} A ${r} ${r} 0 1 1 ${c + r} ${c}`} fill="none" stroke="#1e293b" strokeWidth="6" />
      {pct > 0 && (
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      )}
      <text x={c} y={size / 2 + 4} textAnchor="middle" fill={color} fontSize="13" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {value}%
      </text>
    </svg>
  );
}

// ── main app ───────────────────────────────────────────────────────────────
export default function App() {
  const [selectedStock, setSelectedStock] = useState(STOCKS[0]);
  const [chain, setChain] = useState(() => generateOptionChain(STOCKS[0].price));
  const [signals, setSignals] = useState(null);
  const [prices, setPrices] = useState(() => STOCKS.map((s) => ({ ...s, chg: rand(-2, 2) })));
  const [newsIdx, setNewsIdx] = useState(0);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [sparkData] = useState(() =>
    Array.from({ length: 20 }, (_, i) =>
      selectedStock.price * (1 + Math.sin(i * 0.4) * 0.015 + rand(-0.01, 0.01))
    )
  );
  const [globalSignals, setGlobalSignals] = useState(GLOBAL_SIGNALS);
  const ticker = useRef(null);

  const analyze = useCallback((stock, ch) => {
    setLoading(true);
    setTimeout(() => {
      const sig = computeSignals(stock, ch);
      setSignals(sig);
      setLoading(false);
    }, 800);
  }, []);

  useEffect(() => {
    const ch = generateOptionChain(selectedStock.price);
    setChain(ch);
    analyze(selectedStock, ch);
  }, [selectedStock]);

  // live price ticker
  useEffect(() => {
    ticker.current = setInterval(() => {
      setPrices((prev) =>
        prev.map((s) => ({
          ...s,
          price: s.price * (1 + rand(-0.002, 0.002)),
          chg: s.chg + rand(-0.05, 0.05),
        }))
      );
      setGlobalSignals((prev) =>
        prev.map((g) => ({
          ...g,
          value: g.trend === "up"
            ? String((parseFloat(g.value.replace(/[^0-9.]/g, "")) * (1 + rand(-0.001, 0.003))).toFixed(2)).slice(0, 6)
            : g.value,
        }))
      );
    }, 2000);
    return () => clearInterval(ticker.current);
  }, []);

  // news scroll
  useEffect(() => {
    const t = setInterval(() => setNewsIdx((i) => (i + 1) % NEWS_ITEMS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const actionColor = signals?.action === "BUY" ? "#00ff88" : signals?.action === "SELL" ? "#ff4466" : "#f59e0b";
  const biasColor = signals?.bias === "BULLISH" ? "#00ff88" : signals?.bias === "BEARISH" ? "#ff4466" : "#f59e0b";

  return (
    <div style={{
      minHeight: "100vh", background: "#030712",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: "#e2e8f0", overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap');
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
        .tab-btn{background:none;border:none;cursor:pointer;padding:8px 16px;font-family:inherit;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;border-bottom:2px solid transparent;transition:all .2s;color:#64748b;}
        .tab-btn.active{color:#00ff88;border-bottom-color:#00ff88;}
        .tab-btn:hover{color:#e2e8f0;}
        .stock-btn{background:none;border:1px solid #1e293b;cursor:pointer;padding:8px 14px;font-family:inherit;font-size:11px;color:#94a3b8;border-radius:4px;transition:all .2s;text-align:left;}
        .stock-btn:hover{border-color:#334155;color:#e2e8f0;background:#0f172a;}
        .stock-btn.selected{border-color:#00ff88;color:#00ff88;background:rgba(0,255,136,0.05);}
        .card{background:#0a1628;border:1px solid #1e293b;border-radius:8px;padding:16px;}
        .card-dark{background:#060e1a;border:1px solid #1a2640;border-radius:8px;padding:14px;}
        .glow-green{box-shadow:0 0 20px rgba(0,255,136,0.08);}
        .glow-red{box-shadow:0 0 20px rgba(255,68,102,0.08);}
        .pulse{animation:pulse 2s ease-in-out infinite;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .fade-in{animation:fadeIn .4s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ticker-wrap{overflow:hidden;white-space:nowrap;}
        .ticker-inner{display:inline-block;animation:tickerMove 30s linear infinite;}
        @keyframes tickerMove{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .signal-flash{animation:signalFlash 1s ease}
        @keyframes signalFlash{0%{background:rgba(0,255,136,0.2)}100%{background:transparent}}
        .oi-bar-call{background:linear-gradient(90deg,rgba(0,255,136,0.3),rgba(0,255,136,0.05));border-right:2px solid #00ff88;}
        .oi-bar-put{background:linear-gradient(270deg,rgba(255,68,102,0.3),rgba(255,68,102,0.05));border-left:2px solid #ff4466;}
        .atm-row{background:rgba(245,158,11,0.06);border-top:1px solid rgba(245,158,11,0.2);border-bottom:1px solid rgba(245,158,11,0.2);}
        .progress-bar{height:4px;border-radius:2px;background:#1e293b;overflow:hidden;}
        .progress-fill{height:100%;border-radius:2px;transition:width 1s ease;}
        input[type=text]{background:#0f172a;border:1px solid #1e293b;color:#e2e8f0;padding:8px 12px;font-family:inherit;font-size:12px;border-radius:4px;outline:none;width:100%;}
        input[type=text]:focus{border-color:#334155;}
      `}</style>

      {/* TOP HEADER */}
      <div style={{ background: "#060e1a", borderBottom: "1px solid #1e293b", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #00ff88, #00bfff)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: "0.04em", color: "#00ff88" }}>SIGMAEDGE</div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.15em" }}>MARKET INTELLIGENCE PLATFORM</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "#475569" }}>
            <span className="pulse" style={{ color: "#00ff88", marginRight: 4 }}>●</span>LIVE
          </div>
          <div style={{ fontSize: 10, color: "#475569" }}>
            {new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false })} IST
          </div>
          <div style={{ fontSize: 10, padding: "4px 10px", background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: 4, color: "#00ff88" }}>
            NSE/BSE
          </div>
        </div>
      </div>

      {/* NEWS TICKER */}
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: "6px 20px", display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.1em", flexShrink: 0, padding: "2px 8px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 3 }}>LIVE</div>
        <div style={{ fontSize: 10, color: "#94a3b8", flex: 1, overflow: "hidden", transition: "all .4s" }}>
          {NEWS_ITEMS[newsIdx]}
        </div>
      </div>

      {/* PRICE TICKER BAR */}
      <div style={{ background: "#07101f", borderBottom: "1px solid #1e293b", padding: "6px 0", overflow: "hidden" }}>
        <div className="ticker-wrap">
          <div className="ticker-inner">
            {[...prices, ...prices].map((s, i) => (
              <span key={i} style={{ display: "inline-block", padding: "0 20px", borderRight: "1px solid #1e293b", fontSize: 11 }}>
                <span style={{ color: "#94a3b8", marginRight: 6 }}>{s.sym}</span>
                <span style={{ color: "#e2e8f0", marginRight: 4 }}>₹{fmt(s.price, 1)}</span>
                <span style={{ color: s.chg >= 0 ? "#00ff88" : "#ff4466" }}>{s.chg >= 0 ? "▲" : "▼"}{fmt(Math.abs(s.chg), 2)}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 130px)", overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width: 200, borderRight: "1px solid #1e293b", background: "#060e1a", padding: 12, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.15em", marginBottom: 8, paddingLeft: 4 }}>WATCHLIST</div>
          {prices.map((s) => (
            <button key={s.sym} className={`stock-btn${selectedStock.sym === s.sym ? " selected" : ""}`} onClick={() => setSelectedStock(s)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 11 }}>{s.sym}</span>
                <span style={{ color: s.chg >= 0 ? "#00ff88" : "#ff4466", fontSize: 10 }}>{s.chg >= 0 ? "+" : ""}{fmt(s.chg, 2)}%</span>
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>₹{fmt(s.price, 0)}</div>
            </button>
          ))}

          <div style={{ borderTop: "1px solid #1e293b", marginTop: 8, paddingTop: 12 }}>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.15em", marginBottom: 8, paddingLeft: 4 }}>GLOBAL SIGNALS</div>
            {globalSignals.map((g) => (
              <div key={g.name} style={{ padding: "6px 4px", borderBottom: "1px solid #0f1a2e" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: "#64748b" }}>{g.icon} {g.name}</span>
                </div>
                <div style={{ fontSize: 11, color: g.trend === "up" ? "#00ff88" : g.trend === "down" ? "#ff4466" : "#94a3b8", fontWeight: 600 }}>
                  {g.trend === "up" ? "▲" : g.trend === "down" ? "▼" : "—"} {g.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* STOCK HEADER */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", background: "#07101f", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{selectedStock.sym}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{selectedStock.name} · {selectedStock.sector}</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>
                  ₹{fmt(prices.find(p => p.sym === selectedStock.sym)?.price || selectedStock.price, 2)}
                </div>
                <div style={{ fontSize: 12, color: (prices.find(p => p.sym === selectedStock.sym)?.chg || 0) >= 0 ? "#00ff88" : "#ff4466" }}>
                  {(prices.find(p => p.sym === selectedStock.sym)?.chg || 0) >= 0 ? "▲" : "▼"}
                  {fmt(Math.abs(prices.find(p => p.sym === selectedStock.sym)?.chg || 0), 2)}%
                </div>
              </div>
              <Sparkline
                data={sparkData}
                color={(prices.find(p => p.sym === selectedStock.sym)?.chg || 0) >= 0 ? "#00ff88" : "#ff4466"}
              />
            </div>

            {signals && !loading && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div className="card-dark" style={{ padding: "10px 16px", borderColor: actionColor, boxShadow: `0 0 16px ${actionColor}22` }}>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em" }}>AI SIGNAL</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: actionColor, fontFamily: "'Syne',sans-serif" }}>{signals.action}</div>
                </div>
                <div className="card-dark" style={{ padding: "10px 16px" }}>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em" }}>CONFIDENCE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#00bfff" }}>{signals.confidence}%</div>
                </div>
                <div className="card-dark" style={{ padding: "10px 16px" }}>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em" }}>BIAS</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: biasColor }}>{signals.bias}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{signals.strength}</div>
                </div>
              </div>
            )}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#00bfff", fontSize: 12 }}>
                <span className="pulse">⚙</span> Analysing signals…
              </div>
            )}
          </div>

          {/* TABS */}
          <div style={{ display: "flex", borderBottom: "1px solid #1e293b", background: "#060e1a", padding: "0 20px" }}>
            {["overview", "option chain", "sentiment", "predictions"].map((t) => (
              <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div style={{ flex: 1, overflow: "auto", padding: 20 }} className="fade-in">

            {/* ── OVERVIEW ── */}
            {tab === "overview" && signals && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

                {/* Key Levels */}
                <div className="card glow-green">
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>KEY LEVELS</div>
                  {[
                    { label: "Target 1", val: `₹${signals.target1}`, color: "#00ff88" },
                    { label: "Target 2", val: `₹${signals.target2}`, color: "#00bfff" },
                    { label: "Stop Loss", val: `₹${signals.sl}`, color: "#ff4466" },
                    { label: "Resistance", val: `₹${signals.resistance}`, color: "#f59e0b" },
                    { label: "Support", val: `₹${signals.support}`, color: "#a78bfa" },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b", fontSize: 13 }}>
                      <span style={{ color: "#64748b" }}>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: 700 }}>{item.val}</span>
                    </div>
                  ))}
                </div>

                {/* OI Summary */}
                <div className="card">
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>OPEN INTEREST SUMMARY</div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "#00ff88" }}>CALL OI</span>
                      <span style={{ fontWeight: 600 }}>{signals.totalCallOI}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: "60%", background: "linear-gradient(90deg,#00ff88,#00bfff)" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "#ff4466" }}>PUT OI</span>
                      <span style={{ fontWeight: 600 }}>{signals.totalPutOI}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(parseFloat(signals.pcr) * 50, 95)}%`, background: "linear-gradient(90deg,#ff4466,#ff8888)" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #1e293b", fontSize: 12 }}>
                    <span style={{ color: "#64748b" }}>PCR Ratio</span>
                    <span style={{ fontWeight: 700, color: parseFloat(signals.pcr) > 1 ? "#00ff88" : "#ff4466", fontSize: 16 }}>{signals.pcr}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", textAlign: "center", marginTop: 4 }}>
                    {parseFloat(signals.pcr) > 1.2 ? "🟢 BULLISH — Puts outnumber Calls" : parseFloat(signals.pcr) < 0.8 ? "🔴 BEARISH — Calls outnumber Puts" : "🟡 NEUTRAL — Balanced OI"}
                  </div>
                </div>

                {/* Confidence Gauge */}
                <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", alignSelf: "flex-start" }}>AI CONFIDENCE METER</div>
                  <GaugeArc value={parseFloat(signals.confidence)} size={140} color={actionColor} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: biasColor, fontWeight: 700 }}>{signals.bias} · {signals.strength}</div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
                      IV Skew: {signals.ivSkew > 0 ? "+" : ""}{signals.ivSkew} | Score: {signals.sentimentScore}/100
                    </div>
                  </div>
                </div>

                {/* Global Macro Impact */}
                <div className="card" style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>GLOBAL MACRO IMPACT ANALYSIS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                    {[
                      { factor: "FII/DII Flow", impact: "BULLISH", note: "Net buyers past 5 days", val: "+₹4,230Cr", color: "#00ff88" },
                      { factor: "Crude Oil", impact: "CAUTION", note: "Rising input costs", val: "+3.2%", color: "#f59e0b" },
                      { factor: "USD/INR", impact: "NEUTRAL", note: "Stable range 83-84", val: "83.42", color: "#94a3b8" },
                      { factor: "US Markets", impact: "POSITIVE", note: "S&P500 near highs", val: "+0.6%", color: "#00bfff" },
                    ].map((m) => (
                      <div key={m.factor} className="card-dark" style={{ borderLeft: `3px solid ${m.color}` }}>
                        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{m.factor}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.impact}</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{m.note}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginTop: 6 }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── OPTION CHAIN ── */}
            {tab === "option chain" && (
              <div className="fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em" }}>OPTION CHAIN — {selectedStock.sym} (Near Month Expiry)</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 10, color: "#64748b" }}>
                    <span style={{ color: "#00ff88" }}>■ MAX CALL OI (Resistance)</span>
                    <span style={{ color: "#ff4466" }}>■ MAX PUT OI (Support)</span>
                    <span style={{ color: "#f59e0b" }}>■ ATM Strike</span>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ color: "#475569", fontSize: 10, letterSpacing: "0.08em" }}>
                        <th style={{ padding: "8px 6px", textAlign: "right", borderBottom: "1px solid #1e293b", color: "#00ff88" }}>OI</th>
                        <th style={{ padding: "8px 6px", textAlign: "right", borderBottom: "1px solid #1e293b", color: "#00ff88" }}>VOLUME</th>
                        <th style={{ padding: "8px 6px", textAlign: "right", borderBottom: "1px solid #1e293b", color: "#00ff88" }}>IV%</th>
                        <th style={{ padding: "8px 6px", textAlign: "right", borderBottom: "1px solid #1e293b", color: "#00ff88" }}>LTP</th>
                        <th style={{ padding: "8px 6px", textAlign: "right", borderBottom: "1px solid #1e293b", color: "#00ff88" }}>CHG%</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "1px solid #1e293b", color: "#f59e0b", background: "rgba(245,158,11,0.05)" }}>STRIKE</th>
                        <th style={{ padding: "8px 6px", textAlign: "left", borderBottom: "1px solid #1e293b", color: "#ff4466" }}>CHG%</th>
                        <th style={{ padding: "8px 6px", textAlign: "left", borderBottom: "1px solid #1e293b", color: "#ff4466" }}>LTP</th>
                        <th style={{ padding: "8px 6px", textAlign: "left", borderBottom: "1px solid #1e293b", color: "#ff4466" }}>IV%</th>
                        <th style={{ padding: "8px 6px", textAlign: "left", borderBottom: "1px solid #1e293b", color: "#ff4466" }}>VOLUME</th>
                        <th style={{ padding: "8px 6px", textAlign: "left", borderBottom: "1px solid #1e293b", color: "#ff4466" }}>OI</th>
                      </tr>
                      <tr style={{ color: "#475569", fontSize: 9, letterSpacing: "0.1em" }}>
                        <th colSpan={5} style={{ textAlign: "center", padding: "4px", background: "rgba(0,255,136,0.03)", color: "#00ff88" }}>— CALL OPTIONS —</th>
                        <th style={{ background: "rgba(245,158,11,0.03)" }}></th>
                        <th colSpan={5} style={{ textAlign: "center", padding: "4px", background: "rgba(255,68,102,0.03)", color: "#ff4466" }}>— PUT OPTIONS —</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chain.map((row) => {
                        const isMaxCall = signals && row.strike === signals.resistance;
                        const isMaxPut = signals && row.strike === signals.support;
                        const callBarW = Math.min((row.call.oi / 80000) * 100, 100);
                        const putBarW = Math.min((row.put.oi / 80000) * 100, 100);
                        return (
                          <tr key={row.strike} className={row.isATM ? "atm-row" : ""} style={{ borderBottom: "1px solid #0f172a", transition: "background .2s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#0a1628"}
                            onMouseLeave={e => e.currentTarget.style.background = ""}
                          >
                            <td style={{ padding: "7px 6px", textAlign: "right", background: `linear-gradient(270deg, rgba(0,255,136,${callBarW / 400}) 0%, transparent ${callBarW}%)` }}>
                              <span style={{ color: isMaxCall ? "#00ff88" : "#94a3b8", fontWeight: isMaxCall ? 700 : 400 }}>{fmtVol(row.call.oi)}</span>
                              {isMaxCall && <span style={{ marginLeft: 4, fontSize: 9, color: "#00ff88" }}>MAX</span>}
                            </td>
                            <td style={{ padding: "7px 6px", textAlign: "right", color: "#64748b" }}>{fmtVol(row.call.vol)}</td>
                            <td style={{ padding: "7px 6px", textAlign: "right", color: "#94a3b8" }}>{row.call.iv}</td>
                            <td style={{ padding: "7px 6px", textAlign: "right", color: "#e2e8f0", fontWeight: 600 }}>₹{row.call.ltp}</td>
                            <td style={{ padding: "7px 6px", textAlign: "right", color: parseFloat(row.call.chg) >= 0 ? "#00ff88" : "#ff4466" }}>
                              {parseFloat(row.call.chg) >= 0 ? "+" : ""}{row.call.chg}%
                            </td>
                            <td style={{ padding: "7px 12px", textAlign: "center", fontWeight: 700, fontSize: 12, background: row.isATM ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.03)", color: row.isATM ? "#f59e0b" : "#e2e8f0", borderLeft: "1px solid #1e293b", borderRight: "1px solid #1e293b" }}>
                              {row.strike}
                              {row.isATM && <div style={{ fontSize: 8, color: "#f59e0b", letterSpacing: "0.1em" }}>ATM</div>}
                            </td>
                            <td style={{ padding: "7px 6px", textAlign: "left", color: parseFloat(row.put.chg) >= 0 ? "#00ff88" : "#ff4466" }}>
                              {parseFloat(row.put.chg) >= 0 ? "+" : ""}{row.put.chg}%
                            </td>
                            <td style={{ padding: "7px 6px", textAlign: "left", color: "#e2e8f0", fontWeight: 600 }}>₹{row.put.ltp}</td>
                            <td style={{ padding: "7px 6px", textAlign: "left", color: "#94a3b8" }}>{row.put.iv}</td>
                            <td style={{ padding: "7px 6px", textAlign: "left", color: "#64748b" }}>{fmtVol(row.put.vol)}</td>
                            <td style={{ padding: "7px 6px", textAlign: "left", background: `linear-gradient(90deg, rgba(255,68,102,${putBarW / 400}) 0%, transparent ${putBarW}%)` }}>
                              <span style={{ color: isMaxPut ? "#ff4466" : "#94a3b8", fontWeight: isMaxPut ? 700 : 400 }}>{fmtVol(row.put.oi)}</span>
                              {isMaxPut && <span style={{ marginLeft: 4, fontSize: 9, color: "#ff4466" }}>MAX</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── SENTIMENT ── */}
            {tab === "sentiment" && signals && (
              <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                <div className="card">
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>SENTIMENT BREAKDOWN</div>
                  {[
                    { label: "Options Sentiment", val: parseFloat(signals.sentimentScore), color: "#00bfff" },
                    { label: "Volume Momentum", val: randInt(45, 85), color: "#00ff88" },
                    { label: "IV Skew Bias", val: randInt(30, 75), color: "#a78bfa" },
                    { label: "FII Activity", val: randInt(55, 90), color: "#f59e0b" },
                    { label: "Global Macro", val: randInt(40, 80), color: "#34d399" },
                    { label: "Retail Sentiment", val: randInt(35, 70), color: "#fb7185" },
                  ].map((item) => (
                    <div key={item.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                        <span style={{ color: "#94a3b8" }}>{item.label}</span>
                        <span style={{ color: item.color, fontWeight: 700 }}>{item.val}/100</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${item.val}%`, background: `linear-gradient(90deg, ${item.color}88, ${item.color})` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>MARKET BREADTH</div>
                  {[
                    { label: "Advances", val: randInt(900, 1400), total: 2000, color: "#00ff88" },
                    { label: "Declines", val: randInt(600, 1100), total: 2000, color: "#ff4466" },
                    { label: "Unchanged", val: randInt(100, 300), total: 2000, color: "#64748b" },
                  ].map((item) => (
                    <div key={item.label} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: "#94a3b8" }}>{item.label}</span>
                        <span style={{ color: item.color, fontWeight: 700 }}>{item.val}</span>
                      </div>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div className="progress-fill" style={{ width: `${(item.val / item.total) * 100}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}

                  <div style={{ borderTop: "1px solid #1e293b", paddingTop: 16, marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>CALL vs PUT VOLUME RATIO</div>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#00ff88", fontFamily: "'Syne',sans-serif" }}>{signals.callVolSurge}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>Call Surges</div>
                      </div>
                      <div style={{ fontSize: 20, color: "#1e293b" }}>vs</div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#ff4466", fontFamily: "'Syne',sans-serif" }}>{signals.putVolSurge}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>Put Surges</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>SECTOR HEATMAP</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
                    {[
                      { name: "IT", chg: 1.2, cap: "₹28L Cr" },
                      { name: "Banking", chg: -0.4, cap: "₹22L Cr" },
                      { name: "Pharma", chg: 0.8, cap: "₹9L Cr" },
                      { name: "Auto", chg: 2.1, cap: "₹12L Cr" },
                      { name: "FMCG", chg: -0.2, cap: "₹14L Cr" },
                      { name: "Metal", chg: -1.3, cap: "₹7L Cr" },
                      { name: "Energy", chg: 0.5, cap: "₹18L Cr" },
                      { name: "Realty", chg: 3.2, cap: "₹3L Cr" },
                      { name: "Infra", chg: 1.8, cap: "₹5L Cr" },
                      { name: "PSU Bank", chg: -0.7, cap: "₹8L Cr" },
                      { name: "Telecom", chg: 0.3, cap: "₹6L Cr" },
                      { name: "Media", chg: -2.1, cap: "₹1L Cr" },
                    ].map((s) => (
                      <div key={s.name} style={{
                        padding: "10px 8px", borderRadius: 6, textAlign: "center",
                        background: s.chg > 1 ? "rgba(0,255,136,0.15)" : s.chg > 0 ? "rgba(0,255,136,0.06)" : s.chg > -1 ? "rgba(255,68,102,0.06)" : "rgba(255,68,102,0.15)",
                        border: `1px solid ${s.chg > 0 ? "rgba(0,255,136,0.15)" : "rgba(255,68,102,0.15)"}`,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: s.chg > 0 ? "#00ff88" : "#ff4466" }}>{s.name}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: s.chg > 0 ? "#00ff88" : "#ff4466", marginTop: 2 }}>
                          {s.chg > 0 ? "+" : ""}{s.chg.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{s.cap}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PREDICTIONS ── */}
            {tab === "predictions" && signals && (
              <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                <div className="card glow-green" style={{ borderColor: actionColor + "44" }}>
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>AI PRICE PREDICTION — {selectedStock.sym}</div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Current Price</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0", fontFamily: "'Syne',sans-serif" }}>
                        ₹{fmt(prices.find(p => p.sym === selectedStock.sym)?.price || selectedStock.price, 2)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Predicted Range (Day)</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#00bfff" }}>₹{signals.target1} – ₹{signals.target2}</div>
                    </div>
                  </div>

                  {[
                    { label: "Intraday Target 1", val: `₹${signals.target1}`, pct: `+${fmt(((signals.target1 - selectedStock.price) / selectedStock.price) * 100, 2)}%`, color: "#00ff88", prob: "68%" },
                    { label: "Intraday Target 2", val: `₹${signals.target2}`, pct: `+${fmt(((signals.target2 - selectedStock.price) / selectedStock.price) * 100, 2)}%`, color: "#00bfff", prob: "42%" },
                    { label: "Stop Loss", val: `₹${signals.sl}`, pct: `${fmt(((signals.sl - selectedStock.price) / selectedStock.price) * 100, 2)}%`, color: "#ff4466", prob: "—" },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 8, background: "#060e1a", borderRadius: 6, border: `1px solid ${item.color}22` }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{item.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.val}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: item.color }}>{item.pct}</div>
                        <div style={{ fontSize: 10, color: "#475569" }}>Prob: {item.prob}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>SIGNAL REASONING</div>
                  {[
                    { icon: "📊", title: "PCR Analysis", desc: `PCR of ${signals.pcr} suggests ${parseFloat(signals.pcr) > 1 ? "more puts being bought — protective hedging, typically bullish" : "more calls active — directional bets, monitor carefully"}`, sentiment: parseFloat(signals.pcr) > 1 ? "BULL" : "BEAR" },
                    { icon: "🔥", title: "Max Pain Strike", desc: `Resistance at ₹${signals.resistance} (Max Call OI); Support at ₹${signals.support} (Max Put OI). Stock likely to oscillate between these levels`, sentiment: "NEUTRAL" },
                    { icon: "📈", title: "IV Skew", desc: `${signals.ivSkew > 0 ? "Positive skew — puts pricier than calls, hedging demand elevated" : "Negative skew — calls relatively expensive, directional bullish bets active"}`, sentiment: signals.ivSkew > 0 ? "BEAR" : "BULL" },
                    { icon: "🌐", title: "Global Cues", desc: "US markets strong, DXY softening — favorable for emerging markets. FII inflow trend supports upside", sentiment: "BULL" },
                    { icon: "⚡", title: "Volume Surge", desc: `${signals.callVolSurge} call strikes vs ${signals.putVolSurge} put strikes showing unusual volume. ${signals.callVolSurge > signals.putVolSurge ? "Bullish activity dominant" : "Bearish pressure building"}`, sentiment: signals.callVolSurge > signals.putVolSurge ? "BULL" : "BEAR" },
                  ].map((r) => (
                    <div key={r.title} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #0f172a" }}>
                      <div style={{ fontSize: 18 }}>{r.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{r.title}</span>
                          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 3, background: r.sentiment === "BULL" ? "rgba(0,255,136,0.1)" : r.sentiment === "BEAR" ? "rgba(255,68,102,0.1)" : "rgba(245,158,11,0.1)", color: r.sentiment === "BULL" ? "#00ff88" : r.sentiment === "BEAR" ? "#ff4466" : "#f59e0b" }}>{r.sentiment}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{r.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ gridColumn: "1/-1" }}>
                  <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", marginBottom: 16 }}>WEEKLY OUTLOOK — TOP MOVERS PREDICTION</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                    {prices.slice(0, 8).map((s) => {
                      const predChg = rand(-4, 5);
                      const action = predChg > 1.5 ? "BUY" : predChg < -1.5 ? "SELL" : "NEUTRAL";
                      return (
                        <div key={s.sym} className="card-dark" style={{ borderLeft: `3px solid ${action === "BUY" ? "#00ff88" : action === "SELL" ? "#ff4466" : "#f59e0b"}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{s.sym}</div>
                              <div style={{ fontSize: 10, color: "#475569" }}>{s.sector}</div>
                            </div>
                            <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: action === "BUY" ? "rgba(0,255,136,0.1)" : action === "SELL" ? "rgba(255,68,102,0.1)" : "rgba(245,158,11,0.1)", color: action === "BUY" ? "#00ff88" : action === "SELL" ? "#ff4466" : "#f59e0b", fontWeight: 700 }}>{action}</div>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: predChg >= 0 ? "#00ff88" : "#ff4466", marginTop: 8 }}>
                            {predChg >= 0 ? "+" : ""}{fmt(predChg, 1)}%
                          </div>
                          <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>7-day prediction</div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Conf: {fmt(rand(55, 85), 0)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ background: "#060e1a", borderTop: "1px solid #1e293b", padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: "#334155" }}>
        <span>SIGMAEDGE v2.4 · Powered by AI Signal Engine</span>
        <span>⚠ For educational purposes only. Not financial advice. Consult a SEBI-registered advisor before trading.</span>
        <span>Data simulated · Refresh for new signals</span>
      </div>
    </div>
  );
}
