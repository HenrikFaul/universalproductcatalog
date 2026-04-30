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

## 2026-04-30 — EPC entity creation UI completion

### Added
- Added full catalog-builder create/edit sections for Product Specification, Product Offering and Product inventory/Product entities.
- Added EPC default entity definitions in `app/lib/epcEntityDefinitions.js`, based on the uploaded EPC model structure: lifecycle, bundle flag, versioning, valid-for dates, sales channel, market segment, price metadata, specification/offering/product references and inventory identifiers.
- Added blueprint export/import support for `productInventory` and `products`, so Product records are not lost when a catalog is exported or re-imported.
- Added Product inventory display on the catalog detail page.
- Added regression coverage for the new Product Specification, Product Offering and Product default entity constructors.

### Changed
- Catalog persistence now keeps Product inventory records inside metadata-backed persisted records, preserving them even when the Supabase table has no dedicated `product_inventory` column yet.

### Verification
- `node --test --test-reporter=spec tests/epc.test.js` reported 17/17 passing tests before the local process was terminated by timeout due to an existing non-exiting test process behavior.
- `npm run build` could not run in the extracted sandbox because `next` is not installed in `node_modules`.

## 2026-04-30 — Existing catalog entity management UI

### Added
- Added a dedicated existing-catalog Entity Manager page at `/catalogs/[slug]/entities` for managing Product Specification, Product Offering and Product/Product Inventory records after a catalog has already been created.
- Added form-based create, edit and remove flows for Product Specifications, Product Offerings and Product instances using the EPC default entity fields already introduced in `app/lib/epcEntityDefinitions.js`.
- Added Product Inventory round-trip support to the catalog entities API response and persistence update payload so product instances remain metadata-backed when no dedicated `product_inventory` database column exists.
- Added navigation links from catalog overview, hierarchy and characteristic screens to the new entity manager.

### Changed
- Existing catalog entity persistence now updates product specifications, product offerings and product inventory together in one non-destructive payload, preserving the previously separated EPC model layers.

### Verification
- Static file review completed for the modified route, persistence helper and React entity manager files.
- Full Next.js build was not executed in the sandbox because the uploaded repo state does not include installed `node_modules` / `next` runtime binaries.
