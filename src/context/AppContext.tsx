import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { PairConfig, StockPrice, Holding, TradeRecord, Settings, DEFAULT_SETTINGS, PriceHistory } from '../types';
import { SAMSUNG_PAIR } from '../data/defaultPairs';
import { calculateDisparityRate } from '../utils/calculations';
import { getSignal } from '../utils/signals';
import { generateId } from '../utils/formatters';

const API_BASE = '/api';

interface AppState {
  pairs: PairConfig[];
  prices: Record<string, StockPrice>;
  holdings: Holding[];
  trades: TradeRecord[];
  settings: Settings;
  history: PriceHistory[];
  priceLoading: boolean;
  historyLoading: boolean;
  lastUpdated: string | null;
  addHolding: (h: Omit<Holding, 'id'>) => void;
  updateHolding: (id: string, updates: Partial<Pick<Holding, 'quantity' | 'avgPrice'>>) => void;
  removeHolding: (id: string) => void;
  addTrade: (t: Omit<TradeRecord, 'id'>) => void;
  removeTrade: (id: string) => void;
  updateSettings: (s: Settings) => void;
  getDisparityRate: (pairId: string) => number;
  getSignalForPair: (pairId: string) => ReturnType<typeof getSignal>;
  exportData: () => string;
  importData: (json: string) => boolean;
  refreshPrices: () => void;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pairs] = useState<PairConfig[]>([SAMSUNG_PAIR]);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({
    samsung: { commonPrice: 0, preferredPrice: 0, commonChange: 0, preferredChange: 0 },
  });
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [priceLoading, setPriceLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Fetch real-time prices from API ---
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stock/prices`);
      if (!res.ok) throw new Error('Price API error');
      const data = await res.json();
      setPrices({
        samsung: {
          commonPrice: data.commonPrice,
          preferredPrice: data.preferredPrice,
          commonChange: data.commonChange,
          preferredChange: data.preferredChange,
        },
      });
      setLastUpdated(new Date().toLocaleTimeString('ko-KR'));
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  // --- Fetch history from API ---
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stock/history?days=400`);
      if (!res.ok) throw new Error('History API error');
      const data: PriceHistory[] = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // --- Fetch user data from server (shared across browsers) ---
  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/userdata`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.holdings) setHoldings(data.holdings);
      if (data.trades) setTrades(data.trades);
      if (data.settings) setSettings(data.settings);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  }, []);

  // --- Sync user data to server (debounced) ---
  const syncToServer = useCallback((h: Holding[], t: TradeRecord[], s: Settings) => {
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/userdata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ holdings: h, trades: t, settings: s }),
        });
      } catch (err) {
        console.error('Failed to sync:', err);
      }
    }, 500);
  }, []);

  // Init: fetch everything
  useEffect(() => {
    fetchPrices();
    fetchHistory();
    fetchUserData();
    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    // Refresh user data every 10 seconds (for cross-browser sync)
    const syncInterval = setInterval(fetchUserData, 10000);
    return () => { clearInterval(interval); clearInterval(syncInterval); };
  }, [fetchPrices, fetchHistory, fetchUserData]);

  // CRUD with server sync
  const addHolding = useCallback((h: Omit<Holding, 'id'>) => {
    setHoldings(prev => {
      const next = [...prev, { ...h, id: generateId() }];
      syncToServer(next, trades, settings);
      return next;
    });
  }, [trades, settings, syncToServer]);

  const updateHolding = useCallback((id: string, updates: Partial<Pick<Holding, 'quantity' | 'avgPrice'>>) => {
    setHoldings(prev => {
      const next = prev.map(h => h.id === id ? { ...h, ...updates } : h);
      syncToServer(next, trades, settings);
      return next;
    });
  }, [trades, settings, syncToServer]);

  const removeHolding = useCallback((id: string) => {
    setHoldings(prev => {
      const next = prev.filter(h => h.id !== id);
      syncToServer(next, trades, settings);
      return next;
    });
  }, [trades, settings, syncToServer]);

  const addTrade = useCallback((t: Omit<TradeRecord, 'id'>) => {
    setTrades(prev => {
      const next = [{ ...t, id: generateId() }, ...prev];
      syncToServer(holdings, next, settings);
      return next;
    });
  }, [holdings, settings, syncToServer]);

  const removeTrade = useCallback((id: string) => {
    setTrades(prev => {
      const next = prev.filter(t => t.id !== id);
      syncToServer(holdings, next, settings);
      return next;
    });
  }, [holdings, settings, syncToServer]);

  const updateSettings = useCallback((s: Settings) => {
    setSettings(s);
    syncToServer(holdings, trades, s);
  }, [holdings, trades, syncToServer]);

  const getDisparityRate = useCallback((pairId: string) => {
    const p = prices[pairId];
    return p ? calculateDisparityRate(p.commonPrice, p.preferredPrice) : 0;
  }, [prices]);

  const getSignalForPair = useCallback((pairId: string) => {
    return getSignal(getDisparityRate(pairId), settings);
  }, [getDisparityRate, settings]);

  const exportData = useCallback(() => JSON.stringify({ holdings, trades, settings }, null, 2), [holdings, trades, settings]);
  const importData = useCallback((json: string) => {
    try {
      const d = JSON.parse(json);
      if (d.holdings) setHoldings(d.holdings);
      if (d.trades) setTrades(d.trades);
      if (d.settings) setSettings(d.settings);
      syncToServer(d.holdings || holdings, d.trades || trades, d.settings || settings);
      return true;
    } catch { return false; }
  }, [holdings, trades, settings, syncToServer]);

  return (
    <AppContext.Provider value={{
      pairs, prices, holdings, trades, settings, history,
      priceLoading, historyLoading, lastUpdated,
      addHolding, updateHolding, removeHolding, addTrade, removeTrade,
      updateSettings, getDisparityRate, getSignalForPair,
      exportData, importData, refreshPrices: fetchPrices,
    }}>
      {children}
    </AppContext.Provider>
  );
};
