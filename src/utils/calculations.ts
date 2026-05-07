export const calculateDisparityRate = (commonPrice: number, preferredPrice: number): number => {
  if (commonPrice === 0) return 0;
  return ((commonPrice - preferredPrice) / commonPrice) * 100;
};

export const calculateSwitchSimulation = (
  currentQuantity: number,
  sellPrice: number,
  buyPrice: number,
  commissionRate: number,
  taxRate: number,
) => {
  const grossProceeds = currentQuantity * sellPrice;
  const sellCommission = grossProceeds * (commissionRate / 100);
  const sellTax = grossProceeds * (taxRate / 100);
  const netProceeds = grossProceeds - sellCommission - sellTax;
  const buyCommission = netProceeds * (commissionRate / 100);
  const availableFunds = netProceeds - buyCommission;
  const newQuantity = Math.floor(availableFunds / buyPrice);

  return {
    grossProceeds,
    sellCommission,
    sellTax,
    buyCommission,
    netProceeds: availableFunds,
    newQuantity,
    quantityDiff: newQuantity - currentQuantity,
    totalCost: sellCommission + sellTax + buyCommission,
  };
};
