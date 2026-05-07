import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatDisparityRate } from '../../utils/formatters';
import { getSignalLabel, getSignalEmoji } from '../../utils/signals';

export const SignalAlerts: React.FC = () => {
  const { pairs, getDisparityRate, getSignalForPair } = useApp();
  const navigate = useNavigate();

  const alerts = pairs
    .map(p => ({ pair: p, rate: getDisparityRate(p.id), signal: getSignalForPair(p.id) }))
    .filter(a => a.signal !== 'hold')
    .sort((a, b) => b.rate - a.rate);

  if (alerts.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-text mb-3">🔔 매매 신호</h2>
        <p className="text-slate-muted text-sm">현재 매매 신호가 없습니다. 모든 페어가 관망 구간입니다.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-text mb-3">🔔 매매 신호 알림</h2>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div
            key={a.pair.id}
            className="flex items-center justify-between p-3 rounded-xl bg-navy-900/50 hover:bg-navy-700/50 cursor-pointer transition-colors animate-slide-in"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => navigate(`/detail/${a.pair.id}`)}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{getSignalEmoji(a.signal)}</span>
              <div>
                <span className="font-medium text-slate-text">{a.pair.name}</span>
                <span className="text-sm text-slate-muted ml-2">{getSignalLabel(a.signal)}</span>
              </div>
            </div>
            <span className="font-bold text-cyan-accent">{formatDisparityRate(a.rate)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
