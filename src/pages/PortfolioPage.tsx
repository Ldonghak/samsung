import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatNumber, formatCurrency, formatDate } from '../utils/formatters';

export const PortfolioPage: React.FC = () => {
  const { holdings, trades, prices, addHolding, updateHolding, removeHolding, removeTrade } = useApp();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ type: 'common' as 'common' | 'preferred', quantity: '', avgPrice: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity: '', avgPrice: '' });

  const price = prices['samsung'];
  const enriched = holdings.filter(h => h.pairId === 'samsung').map(h => {
    const cur = h.type === 'common' ? price.commonPrice : price.preferredPrice;
    const evalAmt = cur * h.quantity;
    const costAmt = h.avgPrice * h.quantity;
    const profit = evalAmt - costAmt;
    return { ...h, currentPrice: cur, evalAmount: evalAmt, costAmount: costAmt, profit, profitRate: costAmt > 0 ? (profit / costAmt) * 100 : 0 };
  });

  const totalEval = enriched.reduce((s, h) => s + h.evalAmount, 0);
  const totalCost = enriched.reduce((s, h) => s + h.costAmount, 0);
  const totalProfit = totalEval - totalCost;
  const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const handleAdd = () => {
    if (!form.quantity || !form.avgPrice) return;
    addHolding({
      pairId: 'samsung', name: '삼성전자', type: form.type, quantity: +form.quantity, avgPrice: +form.avgPrice,
      code: form.type === 'common' ? '005930' : '005935',
    });
    setForm({ type: 'common', quantity: '', avgPrice: '' });
    setShow(false);
  };

  const startEdit = (h: typeof enriched[0]) => {
    setEditId(h.id);
    setEditForm({ quantity: String(h.quantity), avgPrice: String(h.avgPrice) });
  };

  const saveEdit = () => {
    if (!editId || !editForm.quantity) return;
    updateHolding(editId, {
      quantity: +editForm.quantity,
      avgPrice: +editForm.avgPrice,
    });
    setEditId(null);
  };

  const cancelEdit = () => setEditId(null);

  const samsungTrades = trades.filter(t => t.pairId === 'samsung');

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">📋 삼성전자 포트폴리오</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-sm text-slate-muted mb-1">총 평가금액</div>
          <div className="text-xl font-bold text-cyan-accent">{formatCurrency(totalEval)}</div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-slate-muted mb-1">총 평가손익</div>
          <div className={`text-xl font-bold ${totalProfit >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
          </div>
        </div>
        <div className="card text-center">
          <div className="text-sm text-slate-muted mb-1">수익률</div>
          <div className={`text-xl font-bold ${totalProfitRate >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
            {totalProfitRate >= 0 ? '+' : ''}{totalProfitRate.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">보유 종목</h2>
          <button className="btn-primary text-sm" onClick={() => setShow(!show)}>{show ? '취소' : '+ 추가'}</button>
        </div>
        {show && (
          <div className="bg-navy-900/60 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3 animate-fade-in">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'common' | 'preferred' })} className="w-full">
              <option value="common">보통주 (005930)</option>
              <option value="preferred">우선주 (005935)</option>
            </select>
            <input type="number" placeholder="수량" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full" />
            <div className="flex gap-2">
              <input type="number" placeholder="평균단가" value={form.avgPrice} onChange={e => setForm({ ...form, avgPrice: e.target.value })} className="w-full" />
              <button className="btn-primary text-sm whitespace-nowrap" onClick={handleAdd}>저장</button>
            </div>
          </div>
        )}
        {enriched.length === 0 ? (
          <p className="text-sm text-slate-muted text-center py-6">보유 종목을 추가해 보세요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-muted border-b border-white/10">
                <th className="pb-2">구분</th><th className="pb-2 text-right">수량</th><th className="pb-2 text-right">평단가</th><th className="pb-2 text-right">현재가</th><th className="pb-2 text-right">평가액</th><th className="pb-2 text-right">손익</th><th className="pb-2 text-center" style={{ width: '100px' }}>관리</th>
              </tr></thead>
              <tbody>
                {enriched.map(h => (
                  <tr key={h.id} className="border-b border-white/5">
                    <td className="py-2.5 font-medium">{h.type === 'common' ? '보통주' : '우선주'}</td>

                    {editId === h.id ? (
                      <>
                        <td className="py-2.5 text-right">
                          <input
                            type="number" value={editForm.quantity}
                            onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
                            className="w-20 text-right text-sm py-1 px-2"
                            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 6, color: '#e6f1ff' }}
                            autoFocus
                          />
                        </td>
                        <td className="py-2.5 text-right">
                          <input
                            type="number" value={editForm.avgPrice}
                            onChange={e => setEditForm({ ...editForm, avgPrice: e.target.value })}
                            className="w-28 text-right text-sm py-1 px-2"
                            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 6, color: '#e6f1ff' }}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 text-right">{formatNumber(h.quantity)}주</td>
                        <td className="py-2.5 text-right">{formatNumber(h.avgPrice)}원</td>
                      </>
                    )}

                    <td className="py-2.5 text-right">{formatNumber(h.currentPrice)}원</td>
                    <td className="py-2.5 text-right">{formatCurrency(h.evalAmount)}</td>
                    <td className={`py-2.5 text-right font-medium ${h.profit >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
                      {h.profit >= 0 ? '+' : ''}{formatCurrency(h.profit)} ({h.profitRate >= 0 ? '+' : ''}{h.profitRate.toFixed(1)}%)
                    </td>
                    <td className="py-2.5 text-center">
                      {editId === h.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={saveEdit} className="text-xs px-2 py-1 rounded bg-cyan-accent/20 text-cyan-accent hover:bg-cyan-accent/30 transition-colors" style={{ border: 'none', cursor: 'pointer' }}>저장</button>
                          <button onClick={cancelEdit} className="text-xs px-2 py-1 rounded bg-white/5 text-slate-muted hover:bg-white/10 transition-colors" style={{ border: 'none', cursor: 'pointer' }}>취소</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEdit(h)} className="text-xs px-2 py-1 rounded bg-white/5 text-slate-muted hover:bg-cyan-accent/20 hover:text-cyan-accent transition-colors" style={{ border: 'none', cursor: 'pointer' }}>✏️ 수정</button>
                          <button onClick={() => removeHolding(h.id)} className="text-xs px-2 py-1 rounded bg-white/5 text-slate-muted hover:bg-signal-danger/20 hover:text-signal-danger transition-colors" style={{ border: 'none', cursor: 'pointer' }}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">📝 전체 매매 기록</h2>
        {samsungTrades.length === 0 ? (
          <p className="text-sm text-slate-muted text-center py-6">매매 기록이 없습니다. 대시보드에서 기록을 추가하세요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-muted border-b border-white/10">
                <th className="pb-2">날짜</th><th className="pb-2">구분</th><th className="pb-2">매수/매도</th><th className="pb-2 text-right">수량</th><th className="pb-2 text-right">가격</th><th className="pb-2 text-right">금액</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {samsungTrades.map(t => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-2">{formatDate(t.date)}</td>
                    <td className="py-2">{t.type === 'common' ? '보통주' : '우선주'}</td>
                    <td className={`py-2 font-medium ${t.action === 'buy' ? 'text-stock-up' : 'text-stock-down'}`}>{t.action === 'buy' ? '매수' : '매도'}</td>
                    <td className="py-2 text-right">{formatNumber(t.quantity)}주</td>
                    <td className="py-2 text-right">{formatNumber(t.price)}원</td>
                    <td className="py-2 text-right">{formatCurrency(t.quantity * t.price)}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => removeTrade(t.id)} className="text-slate-muted hover:text-signal-danger text-xs" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
