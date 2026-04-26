function evaluateEligibility(rule, hasSource, context, errors) {
  const payload = rule.condition_payload || {};

  if (!hasSource) return;

  if (typeof payload.minAge === 'number' && typeof context.customerAge === 'number' && context.customerAge < payload.minAge) {
    errors.push({ code: 'ELIGIBILITY_DENIED', source: rule.source_offering_id, target: rule.target_offering_id });
    return;
  }

  const netIncome = Number(context.netIncome ?? 0);
  const existingLoans = Number(context.existingLoanPayments ?? 0);
  const pmt = Number(context.calculatedPmt ?? 0);
  const jtmLimit = Number(payload.jtmLimit ?? payload.maxDebtToIncomeRatio ?? 0);
  if (jtmLimit > 0 && netIncome > 0) {
    const debtRatio = (existingLoans + pmt) / netIncome;
    if (debtRatio > jtmLimit) {
      errors.push({
        code: payload.errorCode || 'DECLINE_REASON_JTM_LIMIT',
        source: rule.source_offering_id,
        target: rule.target_offering_id,
        details: { debtRatio, jtmLimit }
      });
    }
  }
}

function evaluateRequires(rule, hasSource, hasTarget, errors, requiredAdditions) {
  if (!hasSource) return;

  if (!hasTarget) {
    errors.push({ code: 'REQUIRES_MISSING', source: rule.source_offering_id, target: rule.target_offering_id });
  }

  const autoAdds = rule.condition_payload?.autoAdd;
  if (Array.isArray(autoAdds)) {
    for (const offeringId of autoAdds) requiredAdditions.add(offeringId);
  }
}

function evaluateExcludes(rule, hasSource, hasTarget, context, errors, disabled) {
  if (!hasSource) return;

  disabled.add(rule.target_offering_id);
  const payload = rule.condition_payload || {};

  if (payload.requiresContextMatch && payload.contextKey) {
    const value = context[payload.contextKey];
    const expected = payload.equals;
    if (value !== expected) return;
  }

  if (hasTarget) {
    errors.push({
      code: payload.errorCode || 'EXCLUDES_CONFLICT',
      source: rule.source_offering_id,
      target: rule.target_offering_id,
      message: payload.message
    });
  }
}

function evaluateConstrains(rule, hasSource, hasTarget, context, errors, actions) {
  if (!hasSource) return;

  const payload = rule.condition_payload || {};

  if (hasTarget) {
    const maxQty = payload.maxQty;
    const sourceQty = payload.sourceQty;
    if (typeof maxQty === 'number' && typeof sourceQty === 'number' && sourceQty > maxQty) {
      errors.push({ code: 'CONSTRAINT_VIOLATION', source: rule.source_offering_id, target: rule.target_offering_id });
    }
  }

  if (typeof payload.maxWeightKg === 'number' && typeof context.totalWeightKg === 'number' && context.totalWeightKg > payload.maxWeightKg) {
    actions.push({
      code: payload.actionCode || 'ADDITIONAL_TRUCK_ALLOCATION',
      source: rule.source_offering_id,
      recommendedUnits: Math.ceil(context.totalWeightKg / payload.maxWeightKg)
    });
  }
}

export function evaluateRules({ rules, selectedOfferingIds, changedNodeId, event, workingMemory = new Map(), context = {} }) {
  const start = performance.now();
  const selected = new Set(selectedOfferingIds);
  const impacted = rules.filter((rule) => rule.event_scope === event && (!changedNodeId || rule.source_offering_id === changedNodeId));

  const errors = [];
  const disabled = new Set();
  const requiredAdditions = new Set();
  const actions = [];

  for (const rule of impacted) {
    const cacheKey = `${event}:${rule.id || `${rule.source_offering_id}->${rule.target_offering_id}`}`;
    workingMemory.set(cacheKey, { ts: Date.now(), source: rule.source_offering_id, target: rule.target_offering_id });

    const hasSource = selected.has(rule.source_offering_id);
    const hasTarget = selected.has(rule.target_offering_id);

    if (rule.rule_type === 'ELIGIBILITY') {
      evaluateEligibility(rule, hasSource, context, errors);
    }

    if (rule.rule_type === 'REQUIRES') {
      evaluateRequires(rule, hasSource, hasTarget, errors, requiredAdditions);
    }

    if (rule.rule_type === 'EXCLUDES') {
      evaluateExcludes(rule, hasSource, hasTarget, context, errors, disabled);
    }

    if (rule.rule_type === 'CONSTRAINS') {
      evaluateConstrains(rule, hasSource, hasTarget, context, errors, actions);
    }
  }

  const elapsedMs = performance.now() - start;
  return {
    errors,
    disabled: [...disabled],
    requiredAdditions: [...requiredAdditions],
    actions,
    latencyMs: elapsedMs,
    workingMemorySize: workingMemory.size
  };
}
