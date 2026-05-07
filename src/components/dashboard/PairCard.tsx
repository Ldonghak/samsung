import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PairConfig } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatNumber, formatPercent, formatDisparityRate } from '../../utils/formatters';
import { getSignalLabel, getSignalEmoji, getDisparityBgClass, getSignalBgClass } from '../../utils/signals';

interface Props { pair: PairConfig; index: number; }

export const PairCard: React.FC<Props> = ({ pair, index }) => {
  const { prices, getDisparityRate, getSignalForPair } = useApp();
  const navigate = useNavigate();
  const price = prices[pair.id];
  const rate = getDisparityRate(pair.id);
  const signal = getSignalForPair(pair.id);

  if (!price) return null;

  return (
    <div
      className="card cursor-pointer animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => navigate(`/detail/${pair.id}`)}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-text">{pair.name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSignalBgClass(signal)}`}>
          {getSignalEmoji(signal)} {getSignalLabel(signal)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-navy-900/60 rounded-lg p-2.5">
          <div className="text-xs text-slate-muted mb-1">보통주</div>
          <div className="text-base font-semibold">{formatNumber(price.commonPrice)}원</div>
          <div className={`text-xs font-medium ${price.commonChange >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {formatPercent(price.commonChange)}
          </div>
        </div>
        <div className="bg-navy-900/60 rounded-lg p-2.5">
          <div className="text-xs text-slate-muted mb-1">우선주</div>
          <div className="text-base font-semibold">{formatNumber(price.preferredPrice)}원</div>
          <div className={`text-xs font-medium ${price.preferredChange >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {formatPercent(price.preferredChange)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-muted">괴리율</span>
        <span className={`text-xl font-bold px-3 py-1 rounded-lg ${getDisparityBgClass(rate)}`}>
          {formatDisparityRate(rate)}
        </span>
      </div>
    </div>
  );
};
