import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDisparityRate } from '../../utils/formatters';

export const SummaryCards: React.FC = () => {
  const { pairs, getDisparityRate, getSignalForPair } = useApp();

  const rates = pairs.map(p => getDisparityRate(p.id));
  const avgRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const buySignals = pairs.filter(p => getSignalForPair(p.id) === 'buy_preferred').length;
  const maxRate = rates.length ? Math.max(...rates) : 0;

  const cards = [
    { label: '평균 괴리율', value: formatDisparityRate(avgRate), icon: '📈', color: 'from-cyan-accent/20 to-blue-600/20' },
    { label: '매수 신호', value: `${buySignals}개`, icon: '🔔', color: 'from-signal-danger/20 to-orange-600/20' },
    { label: '최대 괴리율', value: formatDisparityRate(maxRate), icon: '📊', color: 'from-signal-warning/20 to-yellow-600/20' },
    { label: '추적 페어', value: `${pairs.length}개`, icon: '🔗', color: 'from-signal-safe/20 to-emerald-600/20' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`card bg-gradient-to-br ${c.color} animate-fade-in`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-muted">{c.label}</span>
            <span className="text-xl">{c.icon}</span>
          </div>
          <div className="text-2xl font-bold text-slate-text">{c.value}</div>
        </div>
      ))}
    </div>
  );
};
