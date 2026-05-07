import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PriceComparison } from '../components/detail/PriceComparison';
import { DisparityChart } from '../components/detail/DisparityChart';
import { Simulator } from '../components/detail/Simulator';
import { TradeHistory } from '../components/detail/TradeHistory';
import { mockHistory } from '../data/mockHistory';
import { getSignalLabel, getSignalEmoji } from '../utils/signals';

export const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pairs, prices, getDisparityRate, getSignalForPair } = useApp();

  const pair = pairs.find(p => p.id === id);
  if (!pair || !id) return <div className="text-center py-16 text-slate-muted">종목을 찾을 수 없습니다.</div>;

  const price = prices[pair.id];
  const rate = getDisparityRate(pair.id);
  const signal = getSignalForPair(pair.id);
  const history = mockHistory[pair.id] || [];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-slate-muted hover:text-cyan-accent transition-colors text-lg"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold">{pair.name}</h1>
          <span className="text-sm text-slate-muted">{pair.commonCode} / {pair.preferredCode}</span>
          <span className="ml-3 text-sm">{getSignalEmoji(signal)} {getSignalLabel(signal)}</span>
        </div>
      </div>

      {price && (
        <>
          <PriceComparison name={pair.name} price={price} disparityRate={rate} />
          <DisparityChart history={history} />
          <Simulator pairId={pair.id} price={price} />
        </>
      )}
      <TradeHistory pairId={pair.id} pairName={pair.name} />
    </div>
  );
};
