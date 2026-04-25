import { evaluateFormula } from './formulaEngine.js';
import { isEffective } from './effectiveDating.js';

export function resolvePrice({ charge, attributes, priceBooks = [], overrides = [], now = new Date() }) {
  if (!isEffective(charge, now)) throw new Error('Charge not effective for date');

  const runtimeBase = charge.abp_formula
    ? evaluateFormula(charge.abp_formula, { attributes })
    : Number(charge.base_price);

  const eligibleBooks = priceBooks
    .filter((book) => isEffective(book, now))
    .sort((a, b) => a.priority - b.priority);

  const eligibleOverrides = overrides
    .filter((ovr) => isEffective(ovr, now))
    .sort((a, b) => a.waterfall_step - b.waterfall_step);

  let price = runtimeBase;
  for (const book of eligibleBooks) {
    for (const override of eligibleOverrides.filter((ovr) => ovr.price_book_id === book.id)) {
      if (override.override_type === 'ABSOLUTE') price = Number(override.override_value);
      if (override.override_type === 'DELTA') price += Number(override.override_value);
      if (override.override_type === 'PERCENT') price = price * (1 + Number(override.override_value));
    }
  }

  return { amount: Number(price.toFixed(4)), chargeType: charge.charge_type, matchedPriceBooks: eligibleBooks.length };
}
