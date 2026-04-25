function roundCurrency(amount) {
  return Number(amount.toFixed(2));
}

export function computeMonthlyRate(annualRatePct) {
  return Number(annualRatePct) / 12 / 100;
}

export function calculatePmt({ loanAmount, annualRatePct, termInMonths }) {
  const principal = Number(loanAmount);
  const n = Number(termInMonths);
  const r = computeMonthlyRate(annualRatePct);

  if (principal <= 0 || n <= 0) throw new Error('Invalid mortgage inputs');
  if (r === 0) return roundCurrency(principal / n);

  const numerator = r * ((1 + r) ** n);
  const denominator = ((1 + r) ** n) - 1;
  return roundCurrency(principal * (numerator / denominator));
}

export function calculateLtvRatio({ loanAmount, collateralValue }) {
  const loan = Number(loanAmount);
  const collateral = Number(collateralValue);
  if (collateral <= 0) throw new Error('Collateral value must be positive');
  return Number(((loan / collateral) * 100).toFixed(4));
}

export function resolvePremiumAccountMonthlyFee({ incomeHuf, defaultFeeHuf = 1990, thresholdHuf = 500000 }) {
  return Number(incomeHuf) > Number(thresholdHuf) ? 0 : Number(defaultFeeHuf);
}

export function formatCurrencyHuf(value) {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0
  }).format(Number(value));
}
