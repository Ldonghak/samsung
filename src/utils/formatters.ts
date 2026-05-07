export const formatNumber = (num: number): string =>
  num.toLocaleString('ko-KR');

export const formatCurrency = (num: number): string =>
  `${formatNumber(num)}원`;

export const formatPercent = (num: number, decimals = 1): string =>
  `${num >= 0 ? '+' : ''}${num.toFixed(decimals)}%`;

export const formatDisparityRate = (num: number, decimals = 1): string =>
  `${num.toFixed(decimals)}%`;

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

export const formatFullDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
