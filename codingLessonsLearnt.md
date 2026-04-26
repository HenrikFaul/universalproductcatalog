function inIcd10CancerRange(code) {
  if (!code || typeof code !== 'string') return false;
  const normalized = code.toUpperCase();
  return /^C\d{2}/.test(normalized);
}

export function evaluateUnderwriting({ preExistingConditions = [], sumAssuredHuf = 0 }) {
  if (preExistingConditions.some(inIcd10CancerRange)) {
    return {
      status: 'DECLINED',
      errorCode: 'DECLINE_RISK',
      requireServices: []
    };
  }

  if (Number(sumAssuredHuf) > 100000000) {
    return {
      status: 'PENDING_MEDICAL_EXAM',
      errorCode: null,
      requireServices: ['SRV-MED-DIAGNOSTICS']
    };
  }

  return {
    status: 'APPROVED',
    errorCode: null,
    requireServices: []
  };
}

export function calculateRiskPremium({ basePremium, biometricMultipliers = [], riders = [] }) {
  const base = Number(basePremium);
  const multiplierProduct = biometricMultipliers
    .map((m) => Number(m))
    .reduce((acc, cur) => acc * cur, 1);

  const ridersTotal = riders.reduce((sum, rider) => sum + (Number(rider.priceFactor) * Number(rider.sumAssured)), 0);

  return Number(((base * multiplierProduct) + ridersTotal).toFixed(4));
}
