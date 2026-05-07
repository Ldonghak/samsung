import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: '대시보드', icon: '📊' },
  { to: '/portfolio', label: '포트폴리오', icon: '📋' },
  { to: '/settings', label: '설정', icon: '⚙️' },
];

export const Header: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-full px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 no-underline">
            <span className="text-xl font-bold text-cyan-accent">📊</span>
            <span className="text-lg font-bold text-slate-text">삼성전자</span>
            <span className="text-xl text-slate-muted hidden sm:inline">보통주-우선주 괴리율</span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`px-4 py-2 rounded-lg text-2xl font-medium transition-all no-underline ${
                  (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))
                    ? 'bg-cyan-accent/15 text-cyan-accent'
                    : 'text-slate-muted hover:text-slate-text hover:bg-white/5'
                }`}
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            className="md:hidden p-2 rounded-lg text-slate-muted hover:text-slate-text transition-colors"
            onClick={() => setOpen(!open)}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'inherit' }}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>

        {open && (
          <nav className="md:hidden px-4 pb-3 flex flex-col gap-1 animate-fade-in">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-lg text-2xl font-medium transition-all no-underline ${
                  (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))
                    ? 'bg-cyan-accent/15 text-cyan-accent'
                    : 'text-slate-muted hover:text-slate-text hover:bg-white/5'
                }`}
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <div className="h-14" />
    </>
  );
};
