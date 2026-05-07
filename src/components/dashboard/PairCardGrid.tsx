import React from 'react';
import { useApp } from '../../context/AppContext';
import { PairCard } from './PairCard';

export const PairCardGrid: React.FC = () => {
  const { pairs } = useApp();

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-slate-text mb-4">종목 페어</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pairs.map((pair, i) => (
          <PairCard key={pair.id} pair={pair} index={i} />
        ))}
      </div>
    </div>
  );
};
