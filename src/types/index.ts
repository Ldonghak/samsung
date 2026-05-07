export interface PairConfig {
  id: string;
  name: string;
  commonCode: string;
  preferredCode: string;
}

export interface StockPrice {
  commonPrice: number;
  preferredPrice: number;
  commonChange: number;
  preferredChange: number;
  commonYield?: number;
  preferredYield?: number;
  yieldGap?: number;
  dividendDDay?: number;
}

export interface Holding {
  id: string;
  pairId: string;
  name: string;
  type: 'common' | 'preferred';
  quantity: number;
  avgPrice: number;
  code: string;
}

export interface TradeRecord {
  id: string;
  date: string;
  pairId: string;
  name: string;
  type: 'common' | 'preferred';
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
}

export interface Settings {
  buyPreferredThreshold: number;
  buyCommonThreshold: number;
  commissionRate: number;
  taxRate: number;
  alertEnabled: boolean;
  signalAlertEnabled: boolean;
  telegramToken?: string;
  telegramChatId?: string;
}

export interface PriceHistory {
  date: string;
  commonPrice: number;
  preferredPrice: number;
  commonVolume?: number;
  preferredVolume?: number;
  commonForeignRate?: number;
  preferredForeignRate?: number;
  disparityRate: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  ma5?: number;
  ma20?: number;
  ma60?: number;
  rsi?: number;
}

export type SignalType = 'buy_preferred' | 'buy_common' | 'hold';

export const DEFAULT_SETTINGS: Settings = {
  buyPreferredThreshold: 30,
  buyCommonThreshold: 10,
  commissionRate: 0.015,
  taxRate: 0.18,
  alertEnabled: true,
  signalAlertEnabled: true,
  telegramToken: '',
  telegramChatId: '',
};
