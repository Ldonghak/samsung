const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data', 'userdata.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// ============================================================
// 1. CACHING LAYER - Naver API 호출 최소화
// ============================================================
const cache = {
  prices: { data: null, ts: 0, ttl: 60 * 1000 },         // 1분 캐시
  history: { data: null, ts: 0, ttl: 5 * 60 * 1000 },     // 5분 캐시
};

function isCacheValid(key) {
  return cache[key].data && (Date.now() - cache[key].ts < cache[key].ttl);
}

// ============================================================
// 2. USER DATA
// ============================================================
function loadUserData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { holdings: [], trades: [], settings: null };
  }
}

function saveUserData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ============================================================
// 3. NAVER FINANCE DATA FETCHER
// ============================================================
async function fetchNaverChart(code, days = 365) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days - 10);
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');

  const url = `https://fchart.stock.naver.com/siseJson.nhn?symbol=${code}&requestType=1&startTime=${fmt(start)}&endTime=${fmt(end)}&timeframe=day`;

  const res = await fetch(url);
  const text = await res.text();

  const data = [];
  const lines = text.trim().split('\n');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/\["(\d{8})"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\]/);
    if (match) {
      const [, dateStr, open, high, low, close, volume, foreignRate] = match;
      const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      data.push({ date, open: +open, high: +high, low: +low, close: +close, volume: +volume, foreignRate: foreignRate ? +foreignRate : null });
    }
  }

  return data;
}

// ============================================================
// 4. TECHNICAL INDICATORS - 볼린저밴드, 이동평균, RSI
// ============================================================

// Simple Moving Average
function sma(arr, period) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = arr.slice(i - period + 1, i + 1);
    result.push(+(slice.reduce((a, b) => a + b, 0) / period).toFixed(2));
  }
  return result;
}

// Standard Deviation
function stdDev(arr, period) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = arr.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    result.push(+Math.sqrt(variance).toFixed(2));
  }
  return result;
}

// Bollinger Bands on disparity rate
function bollingerBands(disparities, period = 20, mult = 2) {
  const ma = sma(disparities, period);
  const sd = stdDev(disparities, period);
  const upper = [], lower = [];
  for (let i = 0; i < disparities.length; i++) {
    if (ma[i] === null) { upper.push(null); lower.push(null); continue; }
    upper.push(+(ma[i] + mult * sd[i]).toFixed(2));
    lower.push(+(ma[i] - mult * sd[i]).toFixed(2));
  }
  return { ma, upper, lower };
}

// RSI (Relative Strength Index) of disparity rate
function rsi(arr, period = 14) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period) { result.push(null); continue; }
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = arr[j] - arr[j - 1];
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(+(100 - 100 / (1 + rs)).toFixed(1));
  }
  return result;
}

// ============================================================
// 5. BUILD FULL HISTORY WITH INDICATORS
// ============================================================
async function buildFullHistory(days = 500) {
  const [common, preferred] = await Promise.all([
    fetchNaverChart('005930', days),
    fetchNaverChart('005935', days),
  ]);

  const prefMap = new Map(preferred.map(p => [p.date, p]));
  const merged = common
    .filter(c => prefMap.has(c.date))
    .map(c => {
      const p = prefMap.get(c.date);
      const disparityRate = c.close > 0 ? ((c.close - p.close) / c.close * 100) : 0;
      return {
        date: c.date,
        commonPrice: c.close,
        preferredPrice: p.close,
        commonVolume: c.volume,
        preferredVolume: p.volume,
        commonForeignRate: c.foreignRate,
        preferredForeignRate: p.foreignRate,
        disparityRate: +disparityRate.toFixed(2),
      };
    });

  // Calculate technical indicators on disparity rate
  const disparities = merged.map(d => d.disparityRate);
  const bb20 = bollingerBands(disparities, 20, 2);
  const ma5 = sma(disparities, 5);
  const ma20 = sma(disparities, 20);
  const ma60 = sma(disparities, 60);
  const rsi14 = rsi(disparities, 14);

  // Attach indicators to each data point
  const history = merged.map((d, i) => ({
    ...d,
    bb_upper: bb20.upper[i],
    bb_middle: bb20.ma[i],
    bb_lower: bb20.lower[i],
    ma5: ma5[i],
    ma20: ma20[i],
    ma60: ma60[i],
    rsi: rsi14[i],
  }));

  return history;
}

// ============================================================
// 6. SIGNAL GENERATION - 볼린저밴드 기반 매매 신호
// ============================================================
function generateSignal(history) {
  if (!history.length) return { signal: 'hold', reason: '', strength: 0, volatilityAlert: null };
  const last = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : last;

  let volatilityAlert = null;
  const rateDiff = last.disparityRate - prev.disparityRate;
  if (Math.abs(rateDiff) >= 1.0) {
    volatilityAlert = `최근 1일 괴리율 ${Math.abs(rateDiff).toFixed(2)}%p ${rateDiff > 0 ? '급등 (확대)' : '급락 (축소)'}`;
  }

  if (!last.bb_upper || !last.bb_lower || !last.bb_middle) {
    return { signal: 'hold', reason: 'Insufficient data for BB', strength: 0, volatilityAlert };
  }

  const rate = last.disparityRate;
  const bandwidth = last.bb_upper - last.bb_lower;
  const pctB = bandwidth > 0 ? (rate - last.bb_lower) / bandwidth : 0.5;

  // Strong signals
  if (rate >= last.bb_upper) {
    return {
      signal: 'buy_preferred',
      reason: `괴리율(${rate}%)이 볼린저밴드 상단(${last.bb_upper}%)을 돌파 — 우선주 저평가 극대`,
      strength: Math.min(100, Math.round(pctB * 100)),
      pctB: +pctB.toFixed(2),
    };
  }
  if (rate <= last.bb_lower) {
    return {
      signal: 'buy_common',
      reason: `괴리율(${rate}%)이 볼린저밴드 하단(${last.bb_lower}%)을 이탈 — 보통주 상대 저평가`,
      strength: Math.min(100, Math.round((1 - pctB) * 100)),
      pctB: +pctB.toFixed(2),
    };
  }

  // Trend-based with MA crossover
  if (last.ma5 && prev.ma5 && last.ma20 && prev.ma20) {
    // MA5 crosses above MA20 → disparity expanding
    if (prev.ma5 <= prev.ma20 && last.ma5 > last.ma20) {
      return {
        signal: 'buy_preferred',
        reason: `괴리율 5일선이 20일선을 상향 돌파 (골든크로스) — 괴리 확대 추세`,
        strength: 60,
        pctB: +pctB.toFixed(2),
      };
    }
    // MA5 crosses below MA20 → disparity contracting
    if (prev.ma5 >= prev.ma20 && last.ma5 < last.ma20) {
      return {
        signal: 'buy_common',
        reason: `괴리율 5일선이 20일선을 하향 돌파 (데드크로스) — 괴리 축소 추세`,
        strength: 60,
        pctB: +pctB.toFixed(2),
      };
    }
  }

  // Mild signals based on position within band
  if (pctB > 0.8) {
    return {
      signal: 'buy_preferred',
      reason: `괴리율이 볼린저밴드 상단 근접 (%B=${(pctB*100).toFixed(0)}%)`,
      strength: Math.round(pctB * 70),
      pctB: +pctB.toFixed(2),
    };
  }
  if (pctB < 0.2) {
    return {
      signal: 'buy_common',
      reason: `괴리율이 볼린저밴드 하단 근접 (%B=${(pctB*100).toFixed(0)}%)`,
      strength: Math.round((1 - pctB) * 70),
      pctB: +pctB.toFixed(2),
    };
  }

  return {
    signal: 'hold',
    reason: `괴리율이 밴드 중간 영역 (%B=${(pctB*100).toFixed(0)}%) — 관망 추천`,
    strength: 30,
    pctB: +pctB.toFixed(2),
    volatilityAlert,
  };
}

// 예상 연간 배당금 (최근 기준 추정치)
const DIVIDEND = { common: 1444, preferred: 1445 };
const DIVIDEND_EX_DATE = '2026-12-29'; // 가상의 다음 배당락일 (연말 기준)

function getDividendInfo(commonPrice, preferredPrice) {
  const commonYield = (DIVIDEND.common / commonPrice) * 100;
  const preferredYield = (DIVIDEND.preferred / preferredPrice) * 100;
  const yieldGap = preferredYield - commonYield;
  
  const today = new Date();
  const exDate = new Date(DIVIDEND_EX_DATE);
  const diffTime = exDate.getTime() - today.getTime();
  const dDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    commonDividend: DIVIDEND.common,
    preferredDividend: DIVIDEND.preferred,
    commonYield: +commonYield.toFixed(2),
    preferredYield: +preferredYield.toFixed(2),
    yieldGap: +yieldGap.toFixed(2),
    dividendDDay: dDays > 0 ? dDays : 0
  };
}

// ============================================================
// 7. API ENDPOINTS
// ============================================================

// GET /api/stock/prices - 현재가 (캐시 적용)
app.get('/api/stock/prices', async (req, res) => {
  try {
    if (isCacheValid('prices')) {
      return res.json(cache.prices.data);
    }

    const [common, preferred] = await Promise.all([
      fetchNaverChart('005930', 5),
      fetchNaverChart('005935', 5),
    ]);

    if (!common.length || !preferred.length) {
      return res.status(503).json({ error: 'No data from Naver Finance' });
    }

    const c = common[common.length - 1];
    const p = preferred[preferred.length - 1];
    const prevC = common.length > 1 ? common[common.length - 2] : c;
    const prevP = preferred.length > 1 ? preferred[preferred.length - 2] : p;

    const result = {
      commonPrice: c.close,
      preferredPrice: p.close,
      commonChange: +((c.close - prevC.close) / prevC.close * 100).toFixed(2),
      preferredChange: +((p.close - prevP.close) / prevP.close * 100).toFixed(2),
      commonChangeAmt: c.close - prevC.close,
      preferredChangeAmt: p.close - prevP.close,
      commonPrevClose: prevC.close,
      preferredPrevClose: prevP.close,
      commonVolume: c.volume,
      preferredVolume: p.volume,
      commonDate: c.date,
      preferredDate: p.date,
      timestamp: new Date().toISOString(),
      ...getDividendInfo(c.close, p.close),
    };

    cache.prices.data = result;
    cache.prices.ts = Date.now();
    res.json(result);
  } catch (err) {
    console.error('Price fetch error:', err.message);
    if (cache.prices.data) return res.json(cache.prices.data); // serve stale cache
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock/history - 히스토리 + 기술 지표 (캐시 적용)
app.get('/api/stock/history', async (req, res) => {
  try {
    if (isCacheValid('history')) {
      return res.json(cache.history.data);
    }

    const history = await buildFullHistory(500);
    const signal = generateSignal(history);

    const result = { history, signal };

    cache.history.data = result;
    cache.history.ts = Date.now();
    res.json(result);
  } catch (err) {
    console.error('History fetch error:', err.message);
    if (cache.history.data) return res.json(cache.history.data);
    res.status(500).json({ error: err.message });
  }
});

// SSE - Server-Sent Events for real-time price updates
app.get('/api/stock/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendPrices = async () => {
    try {
      // Use cached data if available, otherwise fetch
      if (!isCacheValid('prices')) {
        const [common, preferred] = await Promise.all([
          fetchNaverChart('005930', 5),
          fetchNaverChart('005935', 5),
        ]);
        if (common.length && preferred.length) {
          const c = common[common.length - 1];
          const p = preferred[preferred.length - 1];
          const prevC = common.length > 1 ? common[common.length - 2] : c;
          const prevP = preferred.length > 1 ? preferred[preferred.length - 2] : p;
          cache.prices.data = {
            commonPrice: c.close, preferredPrice: p.close,
            commonChange: +((c.close - prevC.close) / prevC.close * 100).toFixed(2),
            preferredChange: +((p.close - prevP.close) / prevP.close * 100).toFixed(2),
            commonChangeAmt: c.close - prevC.close,
            preferredChangeAmt: p.close - prevP.close,
            commonPrevClose: prevC.close, preferredPrevClose: prevP.close,
            commonVolume: c.volume, preferredVolume: p.volume,
            commonDate: c.date, preferredDate: p.date,
            timestamp: new Date().toISOString(),
            ...getDividendInfo(c.close, p.close),
          };
          cache.prices.ts = Date.now();
        }
      }
      if (cache.prices.data) {
        res.write(`data: ${JSON.stringify(cache.prices.data)}\n\n`);
      }
    } catch (err) {
      console.error('SSE price error:', err.message);
    }
  };

  sendPrices();
  const interval = setInterval(sendPrices, 30000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// User data endpoints
app.get('/api/userdata', (req, res) => {
  res.json(loadUserData());
});

app.post('/api/userdata', (req, res) => {
  saveUserData(req.body);
  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    cache: {
      prices: isCacheValid('prices') ? 'fresh' : 'stale',
      history: isCacheValid('history') ? 'fresh' : 'stale',
    },
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Samsung Disparity Trader API v2.0`);
  console.log(`   http://0.0.0.0:${PORT}\n`);
  console.log(`   📊 GET  /api/stock/prices    현재가 (1분 캐시)`);
  console.log(`   📈 GET  /api/stock/history   히스토리 + BB/MA/RSI (5분 캐시)`);
  console.log(`   🔴 GET  /api/stock/stream    SSE 실시간 스트림`);
  console.log(`   👤 GET  /api/userdata        사용자 데이터`);
  console.log(`   👤 POST /api/userdata        사용자 데이터 저장`);
  console.log(`   💚 GET  /api/health          서버 상태\n`);
});
