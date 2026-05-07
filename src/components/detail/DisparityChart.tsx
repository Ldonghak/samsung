import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PriceHistory } from '../../types';
import { getDisparityHex } from '../../utils/signals';

interface Props { history: PriceHistory[]; }

type Period = '1W' | '1M' | '3M' | '1Y';
const periodDays: Record<Period, number> = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 };
const periodLabels: Record<Period, string> = { '1W': '1주일', '1M': '1개월', '3M': '3개월', '1Y': '1년' };

export const DisparityChart: React.FC<Props> = ({ history }) => {
  const [period, setPeriod] = useState<Period>('3M');

  const data = useMemo(() => {
    const days = periodDays[period];
    return history.slice(-days);
  }, [history, period]);

  const stats = useMemo(() => {
    const rates = data.map(d => d.disparityRate);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    return { avg: +avg.toFixed(2), max: Math.max(...rates), min: Math.min(...rates) };
  }, [data]);

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold">📈 괴리율 추이</h3>
        <div className="flex gap-1">
          {(Object.keys(periodDays) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p ? 'bg-cyan-accent/20 text-cyan-accent' : 'text-slate-muted hover:text-slate-text hover:bg-white/5'
              }`}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center bg-navy-900/50 rounded-lg p-2">
          <div className="text-xs text-slate-muted">평균</div>
          <div className="text-sm font-bold text-cyan-accent">{stats.avg}%</div>
        </div>
        <div className="text-center bg-navy-900/50 rounded-lg p-2">
          <div className="text-xs text-slate-muted">최대</div>
          <div className="text-sm font-bold text-signal-danger">{stats.max.toFixed(1)}%</div>
        </div>
        <div className="text-center bg-navy-900/50 rounded-lg p-2">
          <div className="text-xs text-slate-muted">최소</div>
          <div className="text-sm font-bold text-signal-safe">{stats.min.toFixed(1)}%</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8892b0' }} tickFormatter={v => v.slice(5)} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#8892b0' }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: '#8892b0' }}
            formatter={(v: number) => [`${v.toFixed(2)}%`, '괴리율']}
          />
          <ReferenceLine y={stats.avg} stroke="#00d4ff" strokeDasharray="5 5" strokeWidth={1} />
          <Line
            type="monotone"
            dataKey="disparityRate"
            stroke="#00d4ff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#00d4ff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
