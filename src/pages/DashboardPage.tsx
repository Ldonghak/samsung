import React, { useState, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart, Line, Bar, Cell, Brush } from 'recharts';
import { useApp } from '../context/AppContext';
import { calculateSwitchSimulation } from '../utils/calculations';
import { formatNumber, formatCurrency, formatPercent, formatDate } from '../utils/formatters';
import { getDisparityHex } from '../utils/signals';

type Period = '1M' | '3M' | '6M' | '1Y';
const periodDays: Record<Period, number> = { '1M': 22, '3M': 66, '6M': 132, '1Y': 252 };
const periodLabels: Record<Period, string> = { '1M': '1개월', '3M': '3개월', '6M': '6개월', '1Y': '1년' };

export const DashboardPage: React.FC = () => {
  const { prices, settings, trades, holdings, history, bbSignal, priceLoading, historyLoading, lastUpdated, sseConnected, addTrade, removeTrade, getDisparityRate, refreshPrices } = useApp();
  const price = prices['samsung'];
  const rate = getDisparityRate('samsung');

  const [chartPeriod, setChartPeriod] = useState<Period>('3M');
  const [simQty, setSimQty] = useState(100);
  const [simDir, setSimDir] = useState<'c2p' | 'p2c'>('c2p');
  
  // HTS Style Order State
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [orderTarget, setOrderTarget] = useState<'common' | 'preferred'>('preferred');
  const [orderQty, setOrderQty] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistData, setChecklistData] = useState([false, false, false, false]);

  const chartDataRaw = useMemo(() => history.slice(-periodDays[chartPeriod]), [history, chartPeriod]);
  
  const samsungTrades = trades.filter(t => t.pairId === 'samsung');
  const tradeMap = useMemo(() => {
    const map = new Map();
    samsungTrades.forEach(t => {
      const d = t.date.slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(t);
    });
    return map;
  }, [samsungTrades]);

  const chartData = useMemo(() => {
    return chartDataRaw.map(d => {
      const dayTrades = tradeMap.get(d.date);
      let tradePoint = null;
      if (dayTrades && dayTrades.length > 0) {
        const hasBuyPref = dayTrades.some((t: any) => t.type === 'preferred' && t.action === 'buy');
        const hasSellPref = dayTrades.some((t: any) => t.type === 'preferred' && t.action === 'sell');
        if (hasBuyPref) tradePoint = d.disparityRate - 0.5;
        else if (hasSellPref) tradePoint = d.disparityRate + 0.5;
        else tradePoint = d.disparityRate;
      }
      return { ...d, tradePoint, hasTrade: !!dayTrades };
    });
  }, [chartDataRaw, tradeMap]);

  const stats = useMemo(() => {
    if (!chartData.length) return { avg: 0, max: 0, min: 0, vsAvg: 0, rsi: 50, zScore: 0, avgReversionDays: 0, correlation: 1, momentum: 0 };
    const rates = chartData.map(d => d.disparityRate);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const stdDev = Math.sqrt(rates.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / rates.length);
    const zScore = stdDev > 0 ? (rate - avg) / stdDev : 0;
    const lastRsi = chartData[chartData.length - 1].rsi || 50;
    
    let daysAbove = 0; let reversionCount = 0; let currentStreak = 0;
    rates.forEach(r => {
      if (r > avg) currentStreak++;
      else if (currentStreak > 0) { daysAbove += currentStreak; reversionCount++; currentStreak = 0; }
    });
    const avgReversionDays = reversionCount > 0 ? Math.round(daysAbove / reversionCount) : 0;

    // Correlation
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    const n = chartData.length;
    chartData.forEach(d => {
      sumX += d.commonPrice; sumY += d.preferredPrice;
      sumXY += d.commonPrice * d.preferredPrice;
      sumX2 += d.commonPrice * d.commonPrice; sumY2 += d.preferredPrice * d.preferredPrice;
    });
    const correlation = n > 0 ? (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)) : 0;

    // Momentum (ROC 5-day)
    const roc = rates.length > 5 ? rates[rates.length - 1] - rates[rates.length - 6] : 0;

    return { avg: +avg.toFixed(2), max: +Math.max(...rates).toFixed(2), min: +Math.min(...rates).toFixed(2), vsAvg: +(rate - avg).toFixed(2), rsi: lastRsi, zScore: +zScore.toFixed(2), avgReversionDays, correlation: +correlation.toFixed(4), momentum: +roc.toFixed(2) };
  }, [chartData, rate]);

  const aiBriefing = useMemo(() => {
    let insight = '';
    let recommendation = '';
    
    // Calculate current holdings from holdings context
    const commonHoldings = holdings?.filter(h => h.pairId === 'samsung' && h.type === 'common').reduce((sum, h) => sum + h.quantity, 0) || 0;
    const preferredHoldings = holdings?.filter(h => h.pairId === 'samsung' && h.type === 'preferred').reduce((sum, h) => sum + h.quantity, 0) || 0;

    // Dynamic Logic
    if (stats.zScore > 1.5) {
      insight = `현재 괴리율(${rate.toFixed(1)}%)은 통계적 임계치(Z-Score: ${stats.zScore})를 초과하여 매우 확대된 상태입니다.`;
      if (commonHoldings > 0) {
        const suggestSell = Math.max(1, Math.floor(commonHoldings * 0.3));
        const expectedPref = Math.floor((suggestSell * price.commonPrice) / price.preferredPrice);
        recommendation = `포트폴리오 분석 결과 보통주 ${formatNumber(commonHoldings)}주를 보유 중입니다. 이 중 약 30%인 보통주 ${formatNumber(suggestSell)}주를 즉시 매도하고, 우선주 약 ${formatNumber(expectedPref)}주로 스위칭하는 전략을 권장합니다.`;
      } else {
        recommendation = `보유 중인 보통주가 없어 스위칭이 불가능합니다. 괴리율이 정상화될 때까지 대기하거나 신규 자금으로 우선주 분할 매수를 고려해 볼 수 있습니다.`;
      }
    } else if (stats.zScore < -1.5) {
      insight = `현재 괴리율(${rate.toFixed(1)}%)은 평균 대비 이례적으로 축소된 상태입니다. 보통주가 우선주 대비 저평가된 국면입니다.`;
      if (preferredHoldings > 0) {
        const suggestSell = Math.max(1, Math.floor(preferredHoldings * 0.3));
        const expectedComm = Math.floor((suggestSell * price.preferredPrice) / price.commonPrice);
        recommendation = `포트폴리오 분석 결과 우선주 ${formatNumber(preferredHoldings)}주를 보유 중입니다. 이 중 약 30%인 우선주 ${formatNumber(suggestSell)}주를 매도하고 보통주 약 ${formatNumber(expectedComm)}주로 스위칭하여 향후 괴리율 확대에 대비하는 것을 추천합니다.`;
      } else {
        recommendation = `현재 우선주를 보유하고 계시지 않습니다. 괴리율 축소 사이클이므로 보통주 보유 비중을 늘리는 것이 유리합니다.`;
      }
    } else {
      insight = `현재 괴리율(${rate.toFixed(1)}%)은 과거 단기 평균(${stats.avg}%) 부근에서 안정적인 흐름을 보이고 있습니다.`;
      if (commonHoldings === 0 && preferredHoldings === 0) {
        recommendation = `현재 보유 중인 삼성전자 주식이 없습니다. 모의 주문을 통해 트레이딩 시뮬레이션을 먼저 경험해보세요.`;
      } else {
        recommendation = `현재 보통주 ${formatNumber(commonHoldings)}주, 우선주 ${formatNumber(preferredHoldings)}주를 보유 중입니다. 지금은 변동성이 적은 구간이므로 추가 매매 없이 현 포지션을 유지(Hold)하는 것이 좋습니다.`;
      }
    }

    return { insight, recommendation };
  }, [rate, stats, holdings, price]);

  const simResult = useMemo(() => {
    if (!price.commonPrice) return null;
    const sellP = simDir === 'c2p' ? price.commonPrice : price.preferredPrice;
    const buyP = simDir === 'c2p' ? price.preferredPrice : price.commonPrice;
    return calculateSwitchSimulation(simQty, sellP, buyP, settings.commissionRate, settings.taxRate);
  }, [simQty, simDir, price, settings]);

  const handleOrderSubmit = () => {
    if (!orderQty || !orderPrice) return;
    if (!showChecklist) { setShowChecklist(true); return; }
    if (checklistData.filter(Boolean).length < 3) { alert('체크리스트를 3개 이상 확인해주세요.'); return; }
    
    addTrade({ date: new Date().toISOString(), pairId: 'samsung', name: '삼성전자', type: orderTarget, action: orderType, quantity: +orderQty, price: +orderPrice });
    setOrderQty(''); setOrderPrice('');
    setShowChecklist(false); setChecklistData([false, false, false, false]);
  };

  const getRsiColor = (rsi: number) => {
    if (rsi >= 70) return '#ff4757';
    if (rsi <= 30) return '#3742fa';
    return '#ffa502';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-[#0b0e14]/95 border border-[#1e293b] p-3 text-[22px] shadow-2xl font-mono">
        <div className="text-slate-400 mb-2 border-b border-[#1e293b] pb-1">{label}</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div className="text-[#00d4ff] font-bold">괴리율</div><div className="text-right text-[#00d4ff] font-bold">{d.disparityRate?.toFixed(2)}%</div>
          <div className="text-[#ff6b81]">BB Upper</div><div className="text-right text-slate-300">{d.bb_upper}%</div>
          <div className="text-[#7bed9f]">BB Lower</div><div className="text-right text-slate-300">{d.bb_lower}%</div>
          <div className="col-span-2 my-1 border-t border-[#1e293b]"></div>
          <div className="text-[#ff4757]">보통주</div><div className="text-right text-slate-300">{formatNumber(d.commonPrice)}</div>
          <div className="text-[#3742fa]">우선주</div><div className="text-right text-slate-300">{formatNumber(d.preferredPrice)}</div>
          <div className="text-[#ff4757] opacity-60">Vol(보)</div><div className="text-right text-slate-400">{formatNumber(d.commonVolume)}</div>
          <div className="text-[#3742fa] opacity-60">Vol(우)</div><div className="text-right text-slate-400">{formatNumber(d.preferredVolume)}</div>
        </div>
      </div>
    );
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.hasTrade) return null;
    return <circle cx={cx} cy={cy} r={4} fill="#00d4ff" stroke="#0b0e14" strokeWidth={1.5} />;
  };

  if (priceLoading && !price.commonPrice) {
    return <div className="flex h-screen items-center justify-center bg-[#050505] text-[#00d4ff] font-mono text-xl animate-pulse">CONNECTING TO EXCHANGE...</div>;
  }

  const riskLevel = stats.zScore > 2 ? '극단적 (보통주 매도/우선주 매수)' : stats.zScore < -1.5 ? '경고 (보통주 매수/우선주 매도)' : stats.zScore > 1 ? '상승 국면' : '중립';
  const riskColor = stats.zScore > 2 ? 'text-[#ff4757]' : stats.zScore < -1.5 ? 'text-[#ffa502]' : stats.zScore > 1 ? 'text-[#00d4ff]' : 'text-slate-400';

  return (
    <div className="bg-[#050505] min-h-screen text-slate-300 font-sans pb-10">
      {/* 🖥️ TOP STATUS BAR (HTS Style) */}
      <div className="bg-[#0b0e14] border-b border-[#1e293b] px-4 py-1.5 flex items-center justify-between text-[20px] font-mono tracking-wider sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold text-white"><span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span> 페어 트레이딩 터미널 v3.0</span>
          <span className="text-[#00d4ff]">종목: 005930 / 005935</span>
          <span className="hidden sm:inline">상관계수: {stats.correlation.toFixed(4)}</span>
          <span className="hidden sm:inline">모멘텀(5일): {stats.momentum > 0 ? '+' : ''}{stats.momentum}%p</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className={riskColor}>{riskLevel}</span>
          <span>시스템 시간: {new Date().toLocaleTimeString()}</span>
          {lastUpdated && <button onClick={refreshPrices} className="hover:text-white transition-colors">🔄 동기화</button>}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
        
        {/* ========================================================= */}
        {/* 📉 LEFT PANE: MULTI-PANE CHARTS (Col Span 8) */}
        {/* ========================================================= */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          
          {/* CHART CONTROLS */}
          <div className="bg-[#0b0e14] border border-[#1e293b] rounded-lg p-2 flex justify-between items-center">
            <div className="flex gap-1 bg-[#151b2b] p-1 rounded">
              {(Object.keys(periodDays) as Period[]).map(p => (
                <button key={p} onClick={() => setChartPeriod(p)} className={`px-4 py-1 text-[22px] font-bold rounded transition-colors ${chartPeriod === p ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-slate-200'}`}>{p}</button>
              ))}
            </div>
            {historyLoading && <span className="text-[20px] text-[#00d4ff] animate-pulse font-mono">과거 데이터 불러오는 중...</span>}
            <div className="flex gap-3 text-[20px] font-mono pr-2">
              <span className="text-[#00d4ff] flex items-center gap-1"><div className="w-2 h-0.5 bg-[#00d4ff]"></div> 괴리율</span>
              <span className="text-[#ff6b81] flex items-center gap-1"><div className="w-2 h-0.5 bg-[#ff6b81]"></div> BB 상단</span>
              <span className="text-[#7bed9f] flex items-center gap-1"><div className="w-2 h-0.5 bg-[#7bed9f]"></div> BB 하단</span>
            </div>
          </div>

          {/* MAIN CHART 1: DISPARITY & BB */}
          <div className="bg-[#0b0e14] border border-[#1e293b] rounded-lg p-3 h-[400px] relative">
            <div className="absolute top-4 left-4 z-10 font-mono text-xl text-slate-400 font-bold opacity-50">괴리율 & 볼린저 밴드</div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bbBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6b81" stopOpacity={0.1} /><stop offset="50%" stopColor="transparent" stopOpacity={0} /><stop offset="100%" stopColor="#7bed9f" stopOpacity={0.1} /></linearGradient>
                    <linearGradient id="dispFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4ff" stopOpacity={0.2} /><stop offset="100%" stopColor="#00d4ff" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="1 4" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 18, fill: '#475569' }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis tick={{ fontSize: 18, fill: '#475569', fontFamily: 'monospace' }} tickFormatter={v => `${v.toFixed(1)}%`} domain={['auto','auto']} axisLine={false} tickLine={false} orientation="right" />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="bb_upper" stroke="none" fill="url(#bbBand)" />
                  <Line type="monotone" dataKey="bb_upper" stroke="#ff6b81" strokeWidth={1} strokeDasharray="2 4" dot={false} opacity={0.7} />
                  <Line type="monotone" dataKey="bb_middle" stroke="#64748b" strokeWidth={1} strokeDasharray="2 2" dot={false} opacity={0.5} />
                  <Line type="monotone" dataKey="bb_lower" stroke="#7bed9f" strokeWidth={1} strokeDasharray="2 4" dot={false} opacity={0.7} />
                  <Area type="monotone" dataKey="disparityRate" stroke="#00d4ff" strokeWidth={2} fill="url(#dispFill)" activeDot={{ r: 4, fill: '#00d4ff', stroke: '#0b0e14' }} />
                  <Line type="monotone" dataKey="disparityRate" stroke="none" dot={<CustomDot />} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-600 font-mono text-xl">데이터 없음</div>}
          </div>

          {/* MAIN CHART 2: PRICE & VOLUME OVERLAY */}
          <div className="bg-[#0b0e14] border border-[#1e293b] rounded-lg p-3 h-[250px] relative">
            <div className="absolute top-4 left-4 z-10 font-mono text-xl text-slate-400 font-bold opacity-50">주가 & 거래량 뎁스</div>
            <div className="absolute top-4 right-4 z-10 flex gap-3 text-[18px] font-mono text-slate-500">
              <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-[#ff4757]"></div> 보통주 주가/거래량</span>
              <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-[#3742fa]"></div> 우선주 주가/거래량</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="1 4" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 18, fill: '#475569' }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis yAxisId="price" tick={{ fontSize: 18, fill: '#475569', fontFamily: 'monospace' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} domain={['auto','auto']} axisLine={false} tickLine={false} orientation="right" />
                  <YAxis yAxisId="vol" tick={false} domain={[0,'auto']} axisLine={false} tickLine={false} orientation="left" hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.2 }} />
                  <Bar yAxisId="vol" dataKey="commonVolume" fill="#ff4757" opacity={0.15} radius={[2, 2, 0, 0]} />
                  <Bar yAxisId="vol" dataKey="preferredVolume" fill="#3742fa" opacity={0.15} radius={[2, 2, 0, 0]} />
                  <Line yAxisId="price" type="step" dataKey="commonPrice" stroke="#ff4757" strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                  <Line yAxisId="price" type="step" dataKey="preferredPrice" stroke="#3742fa" strokeWidth={1.5} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                  <Brush dataKey="date" height={20} stroke="#1e293b" fill="#0b0e14" tickFormatter={() => ''} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 💻 RIGHT PANE: TERMINAL INTELLIGENCE & TRADING (Col Span 4) */}
        {/* ========================================================= */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          
          {/* AI ADVISOR PANEL */}
          <div className="bg-gradient-to-br from-[#1e293b] to-[#0b0e14] border border-[#2563eb]/50 rounded-lg p-5 relative overflow-hidden shadow-[0_0_15px_rgba(37,99,235,0.1)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563eb]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <h2 className="text-[20px] font-bold tracking-widest text-[#00d4ff] mb-3 flex items-center gap-2"><span>🤖</span> AI 트레이딩 어드바이저</h2>
            <div className="text-2xl font-bold text-white mb-2 leading-snug">{aiBriefing.insight}</div>
            <div className="bg-[#0b0e14]/60 rounded text-xl text-slate-300 p-3 border border-white/5 font-mono leading-relaxed mt-3">
              <span className="text-[#00d4ff] font-bold block mb-1">💡 맞춤형 조언:</span> {aiBriefing.recommendation}
            </div>
          </div>

          {/* INTEL PANEL */}
          <div className="bg-[#0b0e14] border border-[#1e293b] rounded-lg p-5">
            <h2 className="text-[20px] font-bold tracking-widest text-slate-500 mb-4 flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full animate-pulse"></div> 실시간 인텔리전스</h2>
            
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="text-[20px] font-mono text-slate-400 mb-1">괴리율 스프레드</div>
                <div className="text-5xl font-black font-mono tracking-tighter" style={{ color: getDisparityHex(rate) }}>
                  {rate.toFixed(1)}<span className="text-xl text-slate-600">%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[20px] font-mono text-slate-400 mb-1">Z-스코어 (표준편차)</div>
                <div className={`text-2xl font-black font-mono ${Math.abs(stats.zScore) > 2 ? 'text-[#ff4757]' : 'text-white'}`}>{stats.zScore > 0 ? '+' : ''}{stats.zScore}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-[#1e293b] border border-[#1e293b] rounded-md overflow-hidden font-mono text-[22px] mb-4">
              <div className="bg-[#0b0e14] p-2 flex justify-between"><span className="text-slate-500">평균({periodLabels[chartPeriod]})</span><span className="text-white font-bold">{stats.avg}%</span></div>
              <div className="bg-[#0b0e14] p-2 flex justify-between"><span className="text-slate-500">모멘텀</span><span className={stats.momentum > 0 ? 'text-[#ff4757]' : 'text-[#3742fa]'}>{stats.momentum}%p</span></div>
              <div className="bg-[#0b0e14] p-2 flex justify-between"><span className="text-slate-500">RSI(14)</span><span style={{ color: getRsiColor(stats.rsi) }} className="font-bold">{stats.rsi.toFixed(1)}</span></div>
              <div className="bg-[#0b0e14] p-2 flex justify-between"><span className="text-slate-500">회귀 예상</span><span className="text-white">{stats.avgReversionDays}일</span></div>
            </div>

            <div className="bg-[#151b2b] border border-[#1e293b] p-3 rounded-md text-[22px]">
              <div className="flex items-center gap-2 mb-1.5"><span className="text-slate-400 font-mono">시스템 권고:</span><span className={`font-bold ${bbSignal?.signal !== 'hold' ? 'text-[#ff4757]' : 'text-slate-300'}`}>{bbSignal?.signal === 'buy_preferred' ? '보통주 매도 / 우선주 매수 실행' : bbSignal?.signal === 'buy_common' ? '우선주 매도 / 보통주 매수 실행' : '현재 포지션 유지 (관망)'}</span></div>
              <div className="text-slate-500 font-mono leading-tight">{bbSignal?.signal !== 'hold' ? `통계적 임계치 도달. ${periodLabels[chartPeriod]} 누적 데이터를 바탕으로 볼 때 강한 평균 회귀가 예상됩니다.` : `${periodLabels[chartPeriod]} 누적 데이터 기준 통계적 정상 범위 내에 있습니다.`}</div>
            </div>
          </div>

          {/* QUOTE PANEL */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { t: 'COMMON', p: price.commonPrice, c: price.commonChange, y: price.commonYield, color: '#ff4757' },
              { t: 'PREFERRED', p: price.preferredPrice, c: price.preferredChange, y: price.preferredYield, color: '#3742fa' }
            ].map(s => (
              <div key={s.t} className="bg-[#0b0e14] border border-[#1e293b] rounded-lg p-3 font-mono border-t-2" style={{ borderTopColor: s.color }}>
                <div className="text-[20px] text-slate-500 mb-1">{s.t === 'COMMON' ? '보통주 시세' : '우선주 시세'}</div>
                <div className="text-lg font-bold text-white mb-0.5">{formatNumber(s.p)}</div>
                <div className={`text-[20px] font-bold ${s.c >= 0 ? 'text-[#ff4757]' : 'text-[#3742fa]'}`}>{s.c > 0 ? '+' : ''}{formatPercent(s.c)}</div>
                {s.y && <div className="mt-2 text-[18px] text-slate-500">수익률: <span className="text-white">{s.y.toFixed(2)}%</span></div>}
              </div>
            ))}
          </div>

          {/* HTS ORDER TICKET */}
          <div className="bg-[#0b0e14] border border-[#1e293b] rounded-lg p-0 flex flex-col flex-1">
            <div className="bg-[#151b2b] p-2 border-b border-[#1e293b] flex gap-2">
              <button className={`flex-1 py-1 text-xl font-bold font-mono rounded ${orderType === 'buy' ? 'bg-[#ff4757] text-white' : 'bg-transparent text-slate-500 hover:bg-[#1e293b]'}`} onClick={() => setOrderType('buy')}>매수</button>
              <button className={`flex-1 py-1 text-xl font-bold font-mono rounded ${orderType === 'sell' ? 'bg-[#3742fa] text-white' : 'bg-transparent text-slate-500 hover:bg-[#1e293b]'}`} onClick={() => setOrderType('sell')}>매도</button>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              {!showChecklist ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-[18px] text-slate-500 font-mono mb-1 block">종목</label>
                      <select value={orderTarget} onChange={e => setOrderTarget(e.target.value as any)} className="w-full bg-[#151b2b] border border-[#1e293b] rounded p-2 text-xl text-white font-mono outline-none focus:border-[#2563eb] appearance-none cursor-pointer">
                        <option value="common">005930 (보통주)</option>
                        <option value="preferred">005935 (우선주)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[18px] text-slate-500 font-mono mb-1 block">유형</label>
                      <select disabled className="w-full bg-[#151b2b] border border-[#1e293b] rounded p-2 text-xl text-slate-400 font-mono outline-none appearance-none cursor-not-allowed">
                        <option>지정가 (LIMIT)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4 flex-1">
                    <div className="flex bg-[#151b2b] border border-[#1e293b] rounded overflow-hidden focus-within:border-[#2563eb]">
                      <span className="p-2 text-xl text-slate-500 font-mono border-r border-[#1e293b] bg-[#0b0e14] w-12 text-center">수량</span>
                      <input type="number" placeholder="0" value={orderQty} onChange={e => setOrderQty(e.target.value)} className="w-full bg-transparent p-2 text-right text-2xl font-mono text-white outline-none" />
                    </div>
                    <div className="flex bg-[#151b2b] border border-[#1e293b] rounded overflow-hidden focus-within:border-[#2563eb]">
                      <span className="p-2 text-xl text-slate-500 font-mono border-r border-[#1e293b] bg-[#0b0e14] w-12 text-center">단가</span>
                      <input type="number" placeholder={orderTarget === 'common' ? price.commonPrice.toString() : price.preferredPrice.toString()} value={orderPrice} onChange={e => setOrderPrice(e.target.value)} className="w-full bg-transparent p-2 text-right text-2xl font-mono text-white outline-none" />
                    </div>
                  </div>

                  {/* Simulator Quick Action */}
                  {orderQty && orderPrice && orderTarget === 'preferred' && orderType === 'buy' && (
                    <div className="mb-4 p-2 border border-dashed border-[#00d4ff]/30 bg-[#00d4ff]/5 rounded text-[20px] font-mono text-[#00d4ff]">
                      시뮬레이션: 보통주 {orderQty}주를 우선주로 스위칭 시 세전 약 <span className="font-bold text-white">+{Math.floor(+orderQty * (price.commonPrice / price.preferredPrice) - +orderQty)}주의 수량 증가</span>가 예상됩니다.
                    </div>
                  )}

                  <button 
                    className={`w-full py-3 rounded font-bold font-mono text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50 ${orderType === 'buy' ? 'bg-[#ff4757] hover:bg-[#ff6b81] shadow-[#ff4757]/20' : 'bg-[#3742fa] hover:bg-[#5352ed] shadow-[#3742fa]/20'}`}
                    onClick={handleOrderSubmit}
                    disabled={!orderQty || !orderPrice}
                  >
                    {orderType === 'buy' ? '매수' : '매도'} 주문 전송
                  </button>
                </>
              ) : (
                <div className="flex-1 flex flex-col justify-center animate-fade-in">
                  <div className="text-[20px] font-mono text-[#ffa502] mb-3">! 매매 전 리스크 점검 (필수)</div>
                  <div className="space-y-3 mb-6">
                    {[
                      `현재 괴리율(${rate}%)이 목표 임계치를 초과함`,
                      `분할 매수/매도 전략을 적용함`,
                      `거래세 0.18% 차감 후 순수익 마진 확인 완료`,
                      `관련 거시경제 및 개별 종목 뉴스 확인 완료`
                    ].map((text, idx) => (
                      <label key={idx} className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 accent-[#ffa502] w-3 h-3" checked={checklistData[idx]} onChange={e => { const n = [...checklistData]; n[idx] = e.target.checked; setChecklistData(n); }} />
                        <span className={`text-[20px] font-mono leading-tight ${checklistData[idx] ? 'text-slate-600 line-through' : 'text-slate-300'}`}>{text}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button className="flex-1 py-2 bg-[#ffa502] text-[#0b0e14] font-bold font-mono text-xl rounded disabled:opacity-30" onClick={handleOrderSubmit} disabled={checklistData.filter(Boolean).length < 3}>확정</button>
                    <button className="px-3 py-2 bg-[#1e293b] text-white font-mono text-xl rounded" onClick={() => setShowChecklist(false)}>취소</button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
