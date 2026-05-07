import React, { useState, useMemo } from 'react';
import { StockPrice } from '../../types';
import { useApp } from '../../context/AppContext';
import { calculateSwitchSimulation } from '../../utils/calculations';
import { formatNumber, formatCurrency } from '../../utils/formatters';

interface Props { pairId: string; price: StockPrice; }

export const Simulator: React.FC<Props> = ({ price }) => {
  const { settings } = useApp();
  const [qty, setQty] = useState(100);
  const [direction, setDirection] = useState<'common_to_preferred' | 'preferred_to_common'>('common_to_preferred');

  const result = useMemo(() => {
    const sellPrice = direction === 'common_to_preferred' ? price.commonPrice : price.preferredPrice;
    const buyPrice = direction === 'common_to_preferred' ? price.preferredPrice : price.commonPrice;
    return calculateSwitchSimulation(qty, sellPrice, buyPrice, settings.commissionRate, settings.taxRate);
  }, [qty, direction, price, settings]);

  const isPositive = result.quantityDiff > 0;

  return (
    <div className="card mb-6">
      <h3 className="text-lg font-semibold mb-4">⚡ 스위칭 시뮬레이션</h3>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label className="text-xs text-slate-muted block mb-1">보유 수량</label>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(Math.max(1, +e.target.value))}
            className="w-full"
            min={1}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-muted block mb-1">스위칭 방향</label>
          <select
            value={direction}
            onChange={e => setDirection(e.target.value as typeof direction)}
            className="w-full"
          >
            <option value="common_to_preferred">보통주 → 우선주</option>
            <option value="preferred_to_common">우선주 → 보통주</option>
          </select>
        </div>
      </div>

      <div className="bg-navy-900/60 rounded-xl p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-muted">매도 금액</span>
          <span>{formatCurrency(result.grossProceeds)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-muted">수수료 (매도)</span>
          <span className="text-signal-warning">-{formatCurrency(Math.round(result.sellCommission))}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-muted">거래세</span>
          <span className="text-signal-warning">-{formatCurrency(Math.round(result.sellTax))}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-muted">수수료 (매수)</span>
          <span className="text-signal-warning">-{formatCurrency(Math.round(result.buyCommission))}</span>
        </div>
        <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
          <span className="text-slate-muted">총 비용</span>
          <span className="text-signal-danger font-medium">-{formatCurrency(Math.round(result.totalCost))}</span>
        </div>
        <div className="border-t border-white/10 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-muted">예상 보유 주식</span>
            <span className="text-2xl font-bold text-cyan-accent">{formatNumber(result.newQuantity)}주</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-muted">변동</span>
            <span className={`text-sm font-bold ${isPositive ? 'text-signal-safe' : 'text-signal-danger'}`}>
              {isPositive ? '+' : ''}{result.quantityDiff}주 ({isPositive ? '+' : ''}{((result.quantityDiff / qty) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
