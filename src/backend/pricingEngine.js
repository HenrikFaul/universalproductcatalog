import { evaluateFormula } from './formulaEngine.js';
import { isEffective } from './effectiveDating.js';

function calcChargeAmount(charge, attributes = {}, quantity = 1) {
  switch (charge.calculation_method) {
    case 'FLAT_FEE':
      return Number(charge.base_price);
    case 'PER_UNIT':
      return Number(charge.base_price) * quantity;
    case 'TIERED': {
      const tiers = charge.tiers || [];
      const tier = tiers.find((t) => quantity >= t.min && quantity <= t.max) || tiers[tiers.length - 1];
      return tier ? Number(tier.unit_price) * quantity : Number(charge.base_price) * quantity;
    }
    case 'ATTRIBUTE_BASED':
      return evaluateFormula(charge.abp_formula || '0', { attributes, quantity });
    default:
      return Number(charge.base_price);
  }
}

export function pickPriceBookByDecisionMatrix(priceBooks, context = {}) {
  const sorted = [...priceBooks].sort((a, b) => (a.decision_score ?? 0) - (b.decision_score ?? 0));
  let lo = 0;
  let hi = sorted.length - 1;
  let best = null;
  const target = Number(context.decision_score ?? 0);

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const probe = sorted[mid].decision_score ?? 0;
    if (probe <= target) {
      best = sorted[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best ?? sorted[0] ?? null;
}

export function resolvePrice({ charge, attributes, quantity = 1, priceBooks = [], overrides = [], context = {}, now = new Date() }) {
  if (!isEffective(charge, now)) throw new Error('Charge not effective for date');

  const runtimeBase = calcChargeAmount(charge, attributes, quantity);

  const eligibleBooks = priceBooks
    .filter((book) => isEffective(book, now))
    .sort((a, b) => a.priority - b.priority);

  const selectedBook = pickPriceBookByDecisionMatrix(eligibleBooks, context);

  const eligibleOverrides = overrides
    .filter((ovr) => isEffective(ovr, now) && (!selectedBook || ovr.price_book_id === selectedBook.id))
    .sort((a, b) => a.waterfall_step - b.waterfall_step);

  let price = runtimeBase;
  for (const override of eligibleOverrides) {
    if (override.override_type === 'ABSOLUTE') price = Number(override.override_value);
    if (override.override_type === 'DELTA') price += Number(override.override_value);
    if (override.override_type === 'PERCENT') price = price * (1 + Number(override.override_value));
  }

  return {
    amount: Number(price.toFixed(4)),
    chargeType: charge.charge_type,
    calculationMethod: charge.calculation_method || 'FLAT_FEE',
    matchedPriceBook: selectedBook?.id ?? null
  };
}
