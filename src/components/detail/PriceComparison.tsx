import React from 'react';
import { StockPrice } from '../../types';
import { formatNumber, formatPercent } from '../../utils/formatters';

interface Props { name: string; price: StockPrice; disparityRate: number; }

export const PriceComparison: React.FC<Props> = ({ name, price, disparityRate }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    <div className="card text-center">
      <div className="text-sm text-slate-muted mb-1">보통주</div>
      <div className="text-2xl font-bold">{formatNumber(price.commonPrice)}원</div>
      <div className={`text-sm font-semibold mt-1 ${price.commonChange >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
        {formatPercent(price.commonChange)}
      </div>
    </div>
    <div className="card text-center flex flex-col items-center justify-center">
      <div className="text-sm text-slate-muted mb-1">괴리율</div>
      <div className="text-3xl font-black text-cyan-accent">{disparityRate.toFixed(1)}%</div>
      <div className="text-xs text-slate-muted mt-1">{name}</div>
    </div>
    <div className="card text-center">
      <div className="text-sm text-slate-muted mb-1">우선주</div>
      <div className="text-2xl font-bold">{formatNumber(price.preferredPrice)}원</div>
      <div className={`text-sm font-semibold mt-1 ${price.preferredChange >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
        {formatPercent(price.preferredChange)}
      </div>
    </div>
  </div>
);
