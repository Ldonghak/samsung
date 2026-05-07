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

// Fetch stock chart data from Naver Finance
async function fetchNaverChart(code, days = 365) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days - 10); // extra buffer for weekends/holidays
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');

  const url = `https://fchart.stock.naver.com/siseJson.nhn?symbol=${code}&requestType=1&startTime=${fmt(start)}&endTime=${fmt(end)}&timeframe=day`;

  const res = await fetch(url);
  const text = await res.text();

  const data = [];
  const lines = text.trim().split('\n');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/\["(\d{8})"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\]/);
    if (match) {
      const [, dateStr, open, high, low, close, volume] = match;
      const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      data.push({ date, open: +open, high: +high, low: +low, close: +close, volume: +volume });
    }
  }

  return data;
}

// GET /api/stock/prices - Current Samsung prices
app.get('/api/stock/prices', async (req, res) => {
  try {
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

    res.json({
      commonPrice: c.close,
      preferredPrice: p.close,
      commonChange: +((c.close - prevC.close) / prevC.close * 100).toFixed(2),
      preferredChange: +((p.close - prevP.close) / prevP.close * 100).toFixed(2),
      commonPrevClose: prevC.close,
      preferredPrevClose: prevP.close,
      commonDate: c.date,
      preferredDate: p.date,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Price fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock/history?days=365 - Historical prices for both stocks
app.get('/api/stock/history', async (req, res) => {
  const days = +(req.query.days || 365);
  try {
    const [common, preferred] = await Promise.all([
      fetchNaverChart('005930', days),
      fetchNaverChart('005935', days),
    ]);

    const prefMap = new Map(preferred.map(p => [p.date, p]));
    const history = common
      .filter(c => prefMap.has(c.date))
      .map(c => {
        const p = prefMap.get(c.date);
        const disparityRate = c.close > 0 ? ((c.close - p.close) / c.close * 100) : 0;
        return {
          date: c.date,
          commonPrice: c.close,
          preferredPrice: p.close,
          disparityRate: +disparityRate.toFixed(2),
        };
      });

    res.json(history);
  } catch (err) {
    console.error('History fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/userdata - Shared user data (portfolio, trades, settings)
app.get('/api/userdata', (req, res) => {
  res.json(loadUserData());
});

// POST /api/userdata - Save shared user data
app.post('/api/userdata', (req, res) => {
  saveUserData(req.body);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API server running on http://0.0.0.0:${PORT}`);
  console.log(`   - GET  /api/stock/prices   (실시간 삼성전자 주가)`);
  console.log(`   - GET  /api/stock/history   (과거 주가 히스토리)`);
  console.log(`   - GET  /api/userdata        (사용자 데이터 조회)`);
  console.log(`   - POST /api/userdata        (사용자 데이터 저장)`);
});
