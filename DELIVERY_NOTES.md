function toScaledInt(value, scale = 100) {
  return Math.round(Number(value) * scale);
}

export function calculateColdChainPrice({ distanceKm, ratePerKm, weightKg, ratePerKg, tempMultiplier = 1, fuelMultiplier = 1 }) {
  const base = (Number(distanceKm) * Number(ratePerKm)) + (Number(weightKg) * Number(ratePerKg));
  return Number((base * Number(tempMultiplier) * Number(fuelMultiplier)).toFixed(4));
}

export function calculateBreweryNetPrice({ volumeKg, marketIndexPrice, alphaPct, alphaBasePct, volumeDiscount = 1 }) {
  const qualityModifier = 1 + ((Number(alphaPct) - Number(alphaBasePct)) / 100);
  const net = Number(volumeKg) * (Number(marketIndexPrice) * qualityModifier) * Number(volumeDiscount);
  return Number(net.toFixed(4));
}

export function lookupOpticalGridPrice({ sphereSPH, cylinderCYL, matrix }) {
  const sph = toScaledInt(sphereSPH);
  const cyl = toScaledInt(cylinderCYL);

  const row = (matrix || []).find((entry) => {
    const sphMin = toScaledInt(entry.sphMin);
    const sphMax = toScaledInt(entry.sphMax);
    const cylMin = toScaledInt(entry.cylMin);
    const cylMax = toScaledInt(entry.cylMax);
    return sph >= sphMin && sph <= sphMax && cyl >= cylMin && cyl <= cylMax;
  });

  if (!row) throw new Error('No price matrix row for given SPH/CYL range');
  return Number(row.price);
}
