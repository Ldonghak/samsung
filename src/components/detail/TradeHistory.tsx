import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatNumber, formatDate, formatFullDate } from '../../utils/formatters';

interface Props { pairId: string; pairName: string; }

export const TradeHistory: React.FC<Props> = ({ pairId, pairName }) => {
  const { trades, addTrade, removeTrade } = useApp();
  const pairTrades = trades.filter(t => t.pairId === pairId);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ type: 'common' as 'common' | 'preferred', action: 'buy' as 'buy' | 'sell', quantity: '', price: '' });

  const handleAdd = () => {
    if (!form.quantity || !form.price) return;
    addTrade({
      date: new Date().toISOString(),
      pairId,
      name: pairName,
      type: form.type,
      action: form.action,
      quantity: +form.quantity,
      price: +form.price,
    });
    setForm({ type: 'common', action: 'buy', quantity: '', price: '' });
    setShow(false);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">📝 매매 기록</h3>
        <button className="btn-primary text-sm" onClick={() => setShow(!show)}>
          {show ? '취소' : '+ 기록 추가'}
        </button>
      </div>

      {show && (
        <div className="bg-navy-900/60 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'common' | 'preferred' })} className="w-full">
            <option value="common">보통주</option>
            <option value="preferred">우선주</option>
          </select>
          <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value as 'buy' | 'sell' })} className="w-full">
            <option value="buy">매수</option>
            <option value="sell">매도</option>
          </select>
          <input type="number" placeholder="수량" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full" />
          <div className="flex gap-2">
            <input type="number" placeholder="가격" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full" />
            <button className="btn-primary text-sm whitespace-nowrap" onClick={handleAdd}>저장</button>
          </div>
        </div>
      )}

      {pairTrades.length === 0 ? (
        <p className="text-sm text-slate-muted">매매 기록이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-muted border-b border-white/10">
                <th className="pb-2 pr-4">날짜</th>
                <th className="pb-2 pr-4">구분</th>
                <th className="pb-2 pr-4">매수/매도</th>
                <th className="pb-2 pr-4 text-right">수량</th>
                <th className="pb-2 pr-4 text-right">가격</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {pairTrades.map(t => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/3">
                  <td className="py-2 pr-4">{formatDate(t.date)}</td>
                  <td className="py-2 pr-4">{t.type === 'common' ? '보통주' : '우선주'}</td>
                  <td className={`py-2 pr-4 font-medium ${t.action === 'buy' ? 'text-stock-up' : 'text-stock-down'}`}>
                    {t.action === 'buy' ? '매수' : '매도'}
                  </td>
                  <td className="py-2 pr-4 text-right">{formatNumber(t.quantity)}</td>
                  <td className="py-2 pr-4 text-right">{formatNumber(t.price)}원</td>
                  <td className="py-2">
                    <button onClick={() => removeTrade(t.id)} className="text-slate-muted hover:text-signal-danger transition-colors text-xs" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
