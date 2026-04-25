export function evaluateRules({ rules, selectedOfferingIds, changedNodeId, event, workingMemory = new Map(), context = {} }) {
  const start = performance.now();
  const selected = new Set(selectedOfferingIds);
  const impacted = rules.filter((rule) => rule.event_scope === event && (!changedNodeId || rule.source_offering_id === changedNodeId));

  const errors = [];
  const disabled = new Set();

  for (const rule of impacted) {
    const cacheKey = `${event}:${rule.id || `${rule.source_offering_id}->${rule.target_offering_id}`}`;
    workingMemory.set(cacheKey, { ts: Date.now(), source: rule.source_offering_id, target: rule.target_offering_id });

    const hasSource = selected.has(rule.source_offering_id);
    const hasTarget = selected.has(rule.target_offering_id);

    if (rule.rule_type === 'ELIGIBILITY') {
      const minAge = rule.condition_payload?.minAge;
      const age = context.customerAge;
      if (hasSource && typeof minAge === 'number' && typeof age === 'number' && age < minAge) {
        errors.push({ code: 'ELIGIBILITY_DENIED', source: rule.source_offering_id, target: rule.target_offering_id });
      }
    }

    if (rule.rule_type === 'REQUIRES' && hasSource && !hasTarget) {
      errors.push({ code: 'REQUIRES_MISSING', source: rule.source_offering_id, target: rule.target_offering_id });
    }

    if (rule.rule_type === 'EXCLUDES' && hasSource) {
      disabled.add(rule.target_offering_id);
      if (hasTarget) {
        errors.push({ code: 'EXCLUDES_CONFLICT', source: rule.source_offering_id, target: rule.target_offering_id });
      }
    }

    if (rule.rule_type === 'CONSTRAINS' && hasSource && hasTarget) {
      const maxQty = rule.condition_payload?.maxQty;
      const sourceQty = rule.condition_payload?.sourceQty;
      if (typeof maxQty === 'number' && typeof sourceQty === 'number' && sourceQty > maxQty) {
        errors.push({ code: 'CONSTRAINT_VIOLATION', source: rule.source_offering_id, target: rule.target_offering_id });
      }
    }
  }

  const elapsedMs = performance.now() - start;
  return { errors, disabled: [...disabled], latencyMs: elapsedMs, workingMemorySize: workingMemory.size };
}
