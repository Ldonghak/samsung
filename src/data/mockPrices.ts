import { StockPrice } from '../types';

// 2026-05-07 기준 네이버증권 실시간 데이터
// 삼성전자(005930): 271,500원 (+5,500, +2.07%)
// 삼성전자우(005935): 185,300원 (-4,000, -2.11%)
export const mockPrices: Record<string, StockPrice> = {
  samsung: {
    commonPrice: 271500,
    preferredPrice: 185300,
    commonChange: 2.07,
    preferredChange: -2.11,
  },
};
