import { Settings, SignalType } from '../types';

export const getSignal = (disparityRate: number, settings: Settings): SignalType => {
  if (disparityRate >= settings.buyPreferredThreshold) return 'buy_preferred';
  if (disparityRate <= settings.buyCommonThreshold) return 'buy_common';
  return 'hold';
};

export const getSignalLabel = (signal: SignalType): string => {
  switch (signal) {
    case 'buy_preferred': return '우선주 매수 추천';
    case 'buy_common': return '보통주 매수 추천';
    case 'hold': return '관망';
  }
};

export const getSignalEmoji = (signal: SignalType): string => {
  switch (signal) {
    case 'buy_preferred': return '🔴';
    case 'buy_common': return '🔵';
    case 'hold': return '🟡';
  }
};

export const getDisparityColorClass = (rate: number): string => {
  if (rate >= 30) return 'text-signal-danger';
  if (rate >= 20) return 'text-signal-warning';
  if (rate >= 10) return 'text-signal-caution';
  return 'text-signal-safe';
};

export const getDisparityBgClass = (rate: number): string => {
  if (rate >= 30) return 'bg-signal-danger/15 text-signal-danger border border-signal-danger/30';
  if (rate >= 20) return 'bg-signal-warning/15 text-signal-warning border border-signal-warning/30';
  if (rate >= 10) return 'bg-signal-caution/15 text-signal-caution border border-signal-caution/30';
  return 'bg-signal-safe/15 text-signal-safe border border-signal-safe/30';
};

export const getDisparityHex = (rate: number): string => {
  if (rate >= 30) return '#ff4757';
  if (rate >= 20) return '#ffa502';
  if (rate >= 10) return '#ffd93d';
  return '#2ed573';
};

export const getSignalBgClass = (signal: SignalType): string => {
  switch (signal) {
    case 'buy_preferred': return 'bg-signal-danger/15 text-signal-danger border border-signal-danger/30';
    case 'buy_common': return 'bg-stock-down/15 text-stock-down border border-stock-down/30';
    case 'hold': return 'bg-signal-caution/15 text-signal-caution border border-signal-caution/30';
  }
};
