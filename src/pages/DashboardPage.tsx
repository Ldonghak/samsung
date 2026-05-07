import React, { useState, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart, ComposedChart, Line,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { calculateSwitchSimulation } from '../utils/calculations';
import { formatNumber, formatCurrency, formatPercent, formatDate } from '../utils/formatters';
import { getSignalLabel, getSignalEmoji, getDisparityBgClass, getDisparityHex } from '../utils/signals';

type Period = '1W' | '1M' | '3M' | '1Y';
const periodDays: Record<Period, number> = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 };
const periodLabels: Record<Period, string> = { '1W': '1주일', '1M': '1개월', '3M': '3개월', '1Y': '1년' };

export const DashboardPage: React.FC = () => {
  const {
    prices, settings, trades, history,
    priceLoading, historyLoading, lastUpdated,
    addTrade, removeTrade, getDisparityRate, getSignalForPair, refreshPrices,
  } = useApp();

  const price = prices['samsung'];
  const rate = getDisparityRate('samsung');
  const signal = getSignalForPair('samsung');

  const [chartPeriod, setChartPeriod] = useState<Period>('3M');
  const [chartType, setChartType] = useState<'disparity' | 'price'>('disparity');
  const [simQty, setSimQty] = useState(100);
  const [simDir, setSimDir] = useState<'c2p' | 'p2c'>('c2p');
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeForm, setTradeForm] = useState({ type: 'common' as 'common' | 'preferred', action: 'buy' as 'buy' | 'sell', quantity: '', price: '' });

  const chartData = useMemo(() => history.slice(-periodDays[chartPeriod]), [history, chartPeriod]);
  const stats = useMemo(() => {
    if (!chartData.length) return { avg: 0, max: 0, min: 0, current: 0, vsAvg: 0 };
    const rates = chartData.map(d => d.disparityRate);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    return {
      avg: +avg.toFixed(2), max: +Math.max(...rates).toFixed(2),
      min: +Math.min(...rates).toFixed(2), current: rate, vsAvg: +(rate - avg).toFixed(2),
    };
  }, [chartData, rate]);

  const simResult = useMemo(() => {
    if (!price.commonPrice) return null;
    const sellP = simDir === 'c2p' ? price.commonPrice : price.preferredPrice;
    const buyP = simDir === 'c2p' ? price.preferredPrice : price.commonPrice;
    return calculateSwitchSimulation(simQty, sellP, buyP, settings.commissionRate, settings.taxRate);
  }, [simQty, simDir, price, settings]);

  const samsungTrades = trades.filter(t => t.pairId === 'samsung');
  const priceDiff = price.commonPrice - price.preferredPrice;

  const handleAddTrade = () => {
    if (!tradeForm.quantity || !tradeForm.price) return;
    addTrade({ date: new Date().toISOString(), pairId: 'samsung', name: '삼성전자', type: tradeForm.type, action: tradeForm.action, quantity: +tradeForm.quantity, price: +tradeForm.price });
    setTradeForm({ type: 'common', action: 'buy', quantity: '', price: '' });
    setShowTradeForm(false);
  };

  if (priceLoading && !price.commonPrice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-4xl mb-4 animate-pulse">📊</div>
        <p className="text-slate-muted">네이버 증권에서 실시간 데이터를 가져오는 중...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* HERO */}
      <div className="text-center py-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-sm font-medium text-slate-muted tracking-widest uppercase">Samsung Electronics</span>
          {lastUpdated && (
            <button onClick={refreshPrices} className="text-xs text-cyan-accent hover:underline" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              🔄 {lastUpdated} 갱신
            </button>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-black mb-1">삼성전자 <span className="text-cyan-accent">괴리율</span></h1>
        <p className="text-sm text-slate-muted">보통주 005930 · 우선주 005935 · 실시간 데이터</p>

        <div className="mt-6 inline-flex flex-col items-center">
          <div className="text-6xl sm:text-8xl font-black tracking-tight animate-pulse-glow rounded-2xl px-8 py-4" style={{ color: getDisparityHex(rate) }}>
            {rate.toFixed(1)}%
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className={`text-sm font-semibold px-4 py-1.5 rounded-full ${getDisparityBgClass(rate)}`}>
              {getSignalEmoji(signal)} {getSignalLabel(signal)}
            </span>
            <span className="text-sm text-slate-muted">가격차 {formatCurrency(priceDiff)}</span>
          </div>
        </div>
      </div>

      {/* PRICE COMPARISON */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card bg-gradient-to-br from-stock-up/5 to-transparent border-stock-up/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-muted tracking-wide">보통주</span>
            <span className="text-xs text-slate-muted font-mono">005930</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold">{formatNumber(price.commonPrice)}<span className="text-base font-normal text-slate-muted">원</span></div>
          <div className={`text-sm font-semibold mt-1 ${price.commonChange >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {formatPercent(price.commonChange)}
          </div>
        </div>
        <div className="card bg-gradient-to-br from-stock-down/5 to-transparent border-stock-down/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-muted tracking-wide">우선주</span>
            <span className="text-xs text-slate-muted font-mono">005935</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold">{formatNumber(price.preferredPrice)}<span className="text-base font-normal text-slate-muted">원</span></div>
          <div className={`text-sm font-semibold mt-1 ${price.preferredChange >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {formatPercent(price.preferredChange)}
          </div>
        </div>
      </div>

      {/* KEY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '평균 괴리율', value: `${stats.avg}%`, sub: `${periodLabels[chartPeriod]} 기준`, color: 'text-cyan-accent' },
          { label: '현재 vs 평균', value: `${stats.vsAvg >= 0 ? '+' : ''}${stats.vsAvg}%p`, sub: stats.vsAvg > 0 ? '평균보다 높음' : '평균보다 낮음', color: stats.vsAvg > 2 ? 'text-signal-danger' : stats.vsAvg < -2 ? 'text-signal-safe' : 'text-signal-caution' },
          { label: '최대 괴리율', value: `${stats.max}%`, sub: '기간 내 최고', color: 'text-signal-danger' },
          { label: '최소 괴리율', value: `${stats.min}%`, sub: '기간 내 최저', color: 'text-signal-safe' },
        ].map((s, i) => (
          <div key={i} className="card !p-3 text-center">
            <div className="text-xs text-slate-muted mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-muted mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* CHART */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1">
            {(['disparity', 'price'] as const).map(t => (
              <button key={t} onClick={() => setChartType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chartType === t ? 'bg-cyan-accent/20 text-cyan-accent' : 'text-slate-muted hover:text-slate-text'}`}
                style={{ border: 'none', cursor: 'pointer' }}>
                {t === 'disparity' ? '📊 괴리율' : '💹 주가 비교'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {historyLoading && <span className="text-xs text-slate-muted animate-pulse">데이터 로딩...</span>}
            <div className="flex gap-1">
              {(Object.keys(periodDays) as Period[]).map(p => (
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chartPeriod === p ? 'bg-cyan-accent/20 text-cyan-accent' : 'text-slate-muted hover:text-slate-text'}`}
                  style={{ border: 'none', cursor: 'pointer' }}>
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            {chartType === 'disparity' ? (
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="disparityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8892b0' }} tickFormatter={v => v.slice(5)} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#8892b0' }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: 12 }}>
                        <div style={{ color: '#8892b0', marginBottom: 6 }}>{label}</div>
                        <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>괴리율 : {d.disparityRate.toFixed(2)}%</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
                          <span style={{ color: '#ff4757' }}>삼성전자</span>
                          <span style={{ color: '#e6f1ff', fontWeight: 600 }}>{formatNumber(d.commonPrice)}원</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
                          <span style={{ color: '#3742fa' }}>삼성전자우</span>
                          <span style={{ color: '#e6f1ff', fontWeight: 600 }}>{formatNumber(d.preferredPrice)}원</span>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4, marginTop: 4, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                          <span style={{ color: '#8892b0' }}>가격차</span>
                          <span style={{ color: '#ffa502', fontWeight: 600 }}>{formatNumber(d.commonPrice - d.preferredPrice)}원</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={stats.avg} stroke="#ffa502" strokeDasharray="5 5" strokeWidth={1} label={{ value: `평균 ${stats.avg}%`, position: 'right', fill: '#ffa502', fontSize: 10 }} />
                <Area type="monotone" dataKey="disparityRate" stroke="#00d4ff" strokeWidth={2} fill="url(#disparityGrad)" />
              </AreaChart>
            ) : (
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8892b0' }} tickFormatter={v => v.slice(5)} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#8892b0' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} formatter={(v: number, name: string) => [formatCurrency(v), name === 'commonPrice' ? '보통주' : '우선주']} />
                <Line type="monotone" dataKey="commonPrice" stroke="#ff4757" strokeWidth={2} dot={false} name="commonPrice" />
                <Line type="monotone" dataKey="preferredPrice" stroke="#3742fa" strokeWidth={2} dot={false} name="preferredPrice" />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-[340px] flex items-center justify-center text-slate-muted">차트 데이터를 불러오는 중...</div>
        )}
      </div>

      {/* SIMULATOR + TRADE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">⚡ 스위칭 시뮬레이션</h2>
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="text-xs text-slate-muted block mb-1">보유 수량</label>
              <input type="number" value={simQty} onChange={e => setSimQty(Math.max(1, +e.target.value))} className="w-full" min={1} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-muted block mb-1">방향</label>
              <select value={simDir} onChange={e => setSimDir(e.target.value as 'c2p' | 'p2c')} className="w-full">
                <option value="c2p">보통주 → 우선주</option>
                <option value="p2c">우선주 → 보통주</option>
              </select>
            </div>
          </div>
          {simResult && (
            <div className="bg-navy-900/60 rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-slate-muted">매도 금액</span><span>{formatCurrency(simResult.grossProceeds)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-muted">수수료 (매도+매수)</span><span className="text-signal-warning">-{formatCurrency(Math.round(simResult.sellCommission + simResult.buyCommission))}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-muted">거래세</span><span className="text-signal-warning">-{formatCurrency(Math.round(simResult.sellTax))}</span></div>
              <div className="border-t border-white/10 pt-2.5 flex justify-between text-sm"><span className="text-slate-muted">총 비용</span><span className="text-signal-danger font-medium">-{formatCurrency(Math.round(simResult.totalCost))}</span></div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-muted">예상 보유 주식</span>
                  <span className="text-3xl font-black text-cyan-accent">{formatNumber(simResult.newQuantity)}<span className="text-base font-normal text-slate-muted">주</span></span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-muted">변동</span>
                  <span className={`text-sm font-bold ${simResult.quantityDiff > 0 ? 'text-signal-safe' : 'text-signal-danger'}`}>
                    {simResult.quantityDiff > 0 ? '+' : ''}{simResult.quantityDiff}주 ({simResult.quantityDiff > 0 ? '+' : ''}{((simResult.quantityDiff / simQty) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">📝 매매 기록</h2>
            <button className="btn-primary text-sm" onClick={() => setShowTradeForm(!showTradeForm)}>{showTradeForm ? '취소' : '+ 기록'}</button>
          </div>
          {showTradeForm && (
            <div className="bg-navy-900/60 rounded-xl p-3 mb-4 grid grid-cols-2 gap-2 animate-fade-in">
              <select value={tradeForm.type} onChange={e => setTradeForm({ ...tradeForm, type: e.target.value as 'common' | 'preferred' })} className="w-full">
                <option value="common">보통주</option><option value="preferred">우선주</option>
              </select>
              <select value={tradeForm.action} onChange={e => setTradeForm({ ...tradeForm, action: e.target.value as 'buy' | 'sell' })} className="w-full">
                <option value="buy">매수</option><option value="sell">매도</option>
              </select>
              <input type="number" placeholder="수량" value={tradeForm.quantity} onChange={e => setTradeForm({ ...tradeForm, quantity: e.target.value })} className="w-full" />
              <div className="flex gap-2">
                <input type="number" placeholder="가격" value={tradeForm.price} onChange={e => setTradeForm({ ...tradeForm, price: e.target.value })} className="w-full" />
                <button className="btn-primary text-sm whitespace-nowrap" onClick={handleAddTrade}>저장</button>
              </div>
            </div>
          )}
          {samsungTrades.length === 0 ? (
            <div className="text-center py-8 text-slate-muted">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">매매 기록이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {samsungTrades.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2.5 bg-navy-900/40 rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-muted">{formatDate(t.date)}</span>
                    <span className={`font-medium ${t.action === 'buy' ? 'text-stock-up' : 'text-stock-down'}`}>{t.action === 'buy' ? '매수' : '매도'}</span>
                    <span className="text-slate-muted">{t.type === 'common' ? '보통주' : '우선주'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{formatNumber(t.quantity)}주 · {formatNumber(t.price)}원</span>
                    <button onClick={() => removeTrade(t.id)} className="text-slate-muted hover:text-signal-danger text-xs transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
