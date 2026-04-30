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

## 2026-04-26 – TMF620 grand unification baseline (v4.0.0)
- Added a new Supabase migration (`20260426153000_tmf620_grand_unification.sql`) that introduces the full 12-entity EPC/TMF620 data model with UUID keys, relationship bridge tables, enum domains, JSONB characteristic storage, and GIN indexes.
- Added TMF entity runtime definitions and a headless in-memory entity store with pagination, filtering, field projection, lifecycle-aware soft delete, and relationship-cycle protection.
- Added Next.js API routes for `/api/tmf-api/productCatalogManagement/v4/:entity` and `/api/tmf-api/productCatalogManagement/v4/:entity/:id` supporting CRUD semantics and 400/404/409 error contracts.
- Added automated tests to verify query feature behavior and enforce anti-cycle validation on product offering relationships.

## 2026-04-26 – Hierarchy Studio entity CRUD + readability hardening
- Added catalog entity persistence endpoint (`/api/catalogs/:slug/entities`) and backend patch helper to save product/service/resource definitions and catalog grouping metadata without touching design tokens.
- Extended Hierarchy Studio with an in-place Entity Editor card so users can create/update Product Specification, Service Specification, and Resource Specification records directly from the canvas workflow.
- Wired entity updates to live state in `HierarchyBuilderClient`, so newly created entities are immediately selectable for relationship creation and grouping.
- Increased hierarchy node text readability (larger title/code/type/pill typography and stronger code contrast) to improve legibility in dense graphs.
- Replaced the previous corner-node logo mark with a compact diamond UPC mark variant requested for brand consistency.

## 2026-04-30 – EPC export product-domain import and inventory-aware catalog expansion
- Added `data/epcReferenceCatalog.json`, a normalized imported EPC reference catalog from the attached EPC export package, including 8 Product Specifications, 3 Product Offerings, 97 characteristic definitions, 29 hierarchy/relationship edges, 13 Product Inventory examples and 20 cross-industry EPC modeling extensions.
- Extended the demo catalog registry so the imported EPC reference appears as a first-class catalog (`epc-import-otthonnet-reference`) without overwriting the existing telecom demo catalog.
- Expanded the catalog detail page with EPC import summary, Product Inventory instance table, ProductInventory TMF payload preview and 20-industry universal EPC modeling pattern table.
- Preserved the core EPC separation rule: Product Specification defines the product, Product Offering defines how it is sold, Product Inventory records realized instances, and characteristics carry configurable EAV/JSONB-style behavior across sale, fulfillment and inventory stages.
- Added a regression test to verify imported product specifications, offerings, inventory records, characteristics and industry extensions remain present and connected.
