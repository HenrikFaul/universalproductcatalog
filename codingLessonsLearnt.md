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

## 2026-04-26 – Lessons learned from TMF620 baseline expansion
1. When introducing many new TMF entities quickly, centralizing entity metadata (`TMF_ENTITY_CONFIG`) avoids route-level duplication and keeps validation aligned.
2. Product offering relationship constraints should be validated as directed graphs for BUNDLE/REQUIRES links; this catches business-invalid A→B, B→A loops before persistence.
3. Even when persistence backends differ by environment, implementing pagination/filtering/field projection in a deterministic store abstraction helps keep API contracts stable and testable.
4. For regression-safe rollout, soft delete (`lifecycle_status = RETIRED` + `deleted_at`) gives safer compatibility than hard deletion across interconnected catalog entities.
