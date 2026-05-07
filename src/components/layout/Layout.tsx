import React from 'react';
import { Header } from './Header';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-navy-950">
    <Header />
    <main className="max-w-7xl mx-auto px-4 py-6">
      {children}
    </main>
    <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-slate-muted border-t border-white/5 mt-8">
      <p>⚠️ 본 서비스는 투자 참고 정보를 제공하며, 실제 매매를 자동으로 수행하지 않습니다.</p>
      <p className="mt-1">투자 판단에 대한 모든 책임은 사용자에게 있으며, 주가 데이터는 지연 데이터일 수 있습니다.</p>
    </footer>
  </div>
);
