import { PriceHistory } from '../types';

// 삼성전자 보통주/우선주 실제 가격대 기반 히스토리
// 2025-2026년 현실적인 가격 범위로 시뮬레이션
const generateHistory = (days: number): PriceHistory[] => {
  const history: PriceHistory[] = [];
  // 1년 전 시작 가격 (실제 추세 반영)
  let cp = 185000; // 보통주 1년 전 ~185,000원대
  let pp = 130000; // 우선주 1년 전 ~130,000원대
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 상승 트렌드 + 변동성 (실제 삼성전자 1년 흐름 반영)
    const trendBias = 0.001; // 전체적인 상승 추세
    const marketMove = (Math.random() - 0.47 + trendBias) * 0.018;
    const commonSpecific = (Math.random() - 0.5) * 0.006;
    const preferredSpecific = (Math.random() - 0.5) * 0.010;

    cp = Math.round((cp * (1 + marketMove + commonSpecific)) / 100) * 100;
    pp = Math.round((pp * (1 + marketMove + preferredSpecific)) / 100) * 100;

    // 현실적인 가격 범위 유지
    cp = Math.max(150000, Math.min(300000, cp));
    pp = Math.max(100000, Math.min(210000, pp));

    const disparityRate = cp > 0 ? ((cp - pp) / cp) * 100 : 0;
    history.push({
      date: dateStr,
      commonPrice: cp,
      preferredPrice: pp,
      disparityRate: +disparityRate.toFixed(2),
    });
  }

  // 마지막 데이터를 실제 현재가로 보정
  if (history.length > 0) {
    const last = history[history.length - 1];
    last.commonPrice = 271500;
    last.preferredPrice = 185300;
    last.disparityRate = +((271500 - 185300) / 271500 * 100).toFixed(2);
  }

  return history;
};

export const samsungHistory: PriceHistory[] = generateHistory(365);
export const mockHistory: Record<string, PriceHistory[]> = { samsung: samsungHistory };
