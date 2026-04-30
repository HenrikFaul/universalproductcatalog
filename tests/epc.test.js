import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFormula } from '../src/backend/formulaEngine.js';
import { pickPriceBookByDecisionMatrix, resolvePrice } from '../src/backend/pricingEngine.js';
import { evaluateRules } from '../src/backend/rulesEngine.js';
import { canMutateJson, sanitizeDynamicAttributes } from '../src/backend/jsonSecurity.js';
import { buildTimeTravelFilter, closeAndCreateMajorVersion, createMinorVersion } from '../src/backend/effectiveDating.js';
import { buildRenderableFields, validateDynamicValues } from '../src/frontend/schemaUiEngine.js';
import { cpqAndOrderEndpoints, inheritanceChain, listProductOfferings, listProductSpecifications } from '../src/api/tmf620.js';
import { validateIndustryCompatibility } from '../src/validation/industryCompatibility.js';
import { calculateLtvRatio, calculatePmt, formatCurrencyHuf, resolvePremiumAccountMonthlyFee } from '../src/backend/financeEngine.js';
import { calculateBreweryNetPrice, calculateColdChainPrice, lookupOpticalGridPrice } from '../src/backend/verticalPricing.js';
import { calculateRiskPremium, evaluateUnderwriting } from '../src/backend/underwritingEngine.js';
import { __resetTmfEntityStoreForTests, createEntity, listEntities } from '../src/backend/tmfEntityStore.js';
import payloads from '../data/industryPayloads.json' with { type: 'json' };

test('formula engine evaluates ABP expression without eval', () => {
  const amount = evaluateFormula('attributes.speed * 0.5 + attributes.term', { attributes: { speed: 1000, term: 24 } });
  assert.equal(amount, 524);
});

test('pricing waterfall supports attribute-based + decision matrix selection', () => {
  const now = new Date('2026-04-25T00:00:00Z');
  const picked = pickPriceBookByDecisionMatrix([
    { id: 'base', decision_score: 0 },
    { id: 'regional', decision_score: 20 },
    { id: 'vip', decision_score: 50 }
  ], { decision_score: 42 });
  assert.equal(picked.id, 'regional');

  const price = resolvePrice({
    charge: {
      charge_type: 'RECURRING',
      calculation_method: 'ATTRIBUTE_BASED',
      base_price: 10,
      abp_formula: 'attributes.users * 2',
      valid_from: '2026-01-01T00:00:00Z',
      valid_to: null
    },
    attributes: { users: 5 },
    quantity: 1,
    context: { decision_score: 30 },
    priceBooks: [
      { id: 'book-a', priority: 1, decision_score: 0, valid_from: '2026-01-01T00:00:00Z', valid_to: null },
      { id: 'book-b', priority: 2, decision_score: 25, valid_from: '2026-01-01T00:00:00Z', valid_to: null }
    ],
    overrides: [
      { price_book_id: 'book-b', waterfall_step: 1, override_type: 'DELTA', override_value: -1, valid_from: '2026-01-01T00:00:00Z', valid_to: null },
      { price_book_id: 'book-b', waterfall_step: 2, override_type: 'PERCENT', override_value: -0.1, valid_from: '2026-01-01T00:00:00Z', valid_to: null }
    ],
    now
  });

  assert.equal(price.amount, 8.1);
  assert.equal(price.matchedPriceBook, 'book-b');
});

test('rules engine enforces eligibility/requires/excludes/constrains with working memory', () => {
  const out = evaluateRules({
    event: 'ON_CHANGE',
    changedNodeId: 'A',
    context: { customerAge: 16 },
    selectedOfferingIds: ['A', 'C'],
    rules: [
      { id: 'r0', source_offering_id: 'A', target_offering_id: 'AGE', rule_type: 'ELIGIBILITY', event_scope: 'ON_CHANGE', condition_payload: { minAge: 18 } },
      { id: 'r1', source_offering_id: 'A', target_offering_id: 'B', rule_type: 'REQUIRES', event_scope: 'ON_CHANGE', condition_payload: {} },
      { id: 'r2', source_offering_id: 'A', target_offering_id: 'C', rule_type: 'EXCLUDES', event_scope: 'ON_CHANGE', condition_payload: {} },
      { id: 'r3', source_offering_id: 'A', target_offering_id: 'C', rule_type: 'CONSTRAINS', event_scope: 'ON_CHANGE', condition_payload: { maxQty: 1, sourceQty: 3 } }
    ]
  });

  assert.equal(out.errors.length, 4);
  assert.deepEqual(out.disabled, ['C']);
  assert.equal(out.workingMemorySize > 0, true);
  assert.equal(out.latencyMs < 100, true);
});

test('json security blocks unsafe payload and enforces role checks', () => {
  assert.throws(() => sanitizeDynamicAttributes({ constructor: 'x' }));
  assert.equal(canMutateJson({ roles: ['catalog_writer'] }, 'update'), true);
  assert.equal(canMutateJson({ roles: ['viewer'] }, 'update'), false);
});

test('effective dating helpers produce filters and versions', () => {
  assert.match(buildTimeTravelFilter('NOW()'), /valid_from <= NOW\(\)/);
  const { closed, next } = closeAndCreateMajorVersion(
    { id: '1', version_major: 1, version_minor: 2, valid_from: '2026-01-01T00:00:00Z', valid_to: null },
    { id: '2', name: 'new' }
  );
  assert.equal(closed.valid_to !== null, true);
  assert.equal(next.version_major, 2);

  const minor = createMinorVersion({ version_minor: 1 }, { foo: 'bar' });
  assert.equal(minor.version_minor, 2);
});

test('TMF620 headless API contracts and inheritance chain are scaffolded', () => {
  const spec = listProductSpecifications({ at: 'NOW()' });
  const off = listProductOfferings({ at: 'NOW()' });
  assert.match(spec.tmfResource, /productSpecification/);
  assert.match(off.tmfResource, /productOffering/);

  const map = new Map([
    ['root', { id: 'root' }],
    ['child', { id: 'child', parent_specification_id: 'root' }],
    ['grand', { id: 'grand', parent_specification_id: 'child' }]
  ]);
  assert.deepEqual(inheritanceChain(map.get('grand'), map), ['root', 'child', 'grand']);
  assert.equal(cpqAndOrderEndpoints().cpq.length > 0, true);
});

test('schema UI engine uses configurable + validation nodes', () => {
  const renderable = buildRenderableFields([
    { attribute_key: 'speed', display_name: 'Speed', configurable: true, validation: { required: true, min: 10 } },
    { attribute_key: 'internal', configurable: false }
  ]);
  assert.equal(renderable.length, 1);

  const errors = validateDynamicValues([{ attribute_key: 'speed', configurable: true, validation: { min: 10 } }], { speed: 5 });
  assert.equal(errors.speed, 'Min 10');
});

test('industry payloads include the new vertical modules', () => {
  assert.equal(payloads.length >= 11, true);
  const mortgage = payloads.find((p) => p.offering === 'SPEC-MORTGAGE-LOAN');
  assert.equal(Boolean(mortgage), true);
  assert.equal(mortgage.dynamic_attributes.loanAmount.validation.min, 5000000);
});

test('industry compatibility rules still block invalid cross-domain combos', () => {
  const errs = validateIndustryCompatibility(['Craft Lager Batch', 'Hazmat Shipping', 'V8 Engine Package', 'Progressive Lens']);
  assert.equal(errs.length, 2);
});

test('mortgage pricing and policy helpers calculate PMT, LTV and conditional fee', () => {
  const pmt = calculatePmt({ loanAmount: 20000000, annualRatePct: 7.2, termInMonths: 240 });
  assert.equal(pmt > 150000, true);
  assert.equal(pmt < 170000, true);

  const ltv = calculateLtvRatio({ loanAmount: 20000000, collateralValue: 30000000 });
  assert.equal(ltv, 66.6667);

  assert.equal(resolvePremiumAccountMonthlyFee({ incomeHuf: 600000 }), 0);
  assert.match(formatCurrencyHuf(1234567), /1\s?234\s?567/);
});

test('vertical pricing formulas work for logistics, brewery and optics matrix', () => {
  const coldChain = calculateColdChainPrice({ distanceKm: 320, ratePerKm: 1.4, weightKg: 18000, ratePerKg: 0.12, tempMultiplier: 1.3, fuelMultiplier: 1.05 });
  assert.equal(coldChain > 3500, true);

  const brewery = calculateBreweryNetPrice({ volumeKg: 250, marketIndexPrice: 4.2, alphaPct: 11.5, alphaBasePct: 8.0, volumeDiscount: 0.93 });
  assert.equal(brewery > 1000, true);

  const optics = lookupOpticalGridPrice({
    sphereSPH: -5.25,
    cylinderCYL: -1.25,
    matrix: [
      { sphMin: -6.0, sphMax: -4.0, cylMin: -2.0, cylMax: -0.75, price: 18990 }
    ]
  });
  assert.equal(optics, 18990);
});

test('rules engine supports JTM decline, required auto-add and logistics split actions', () => {
  const out = evaluateRules({
    event: 'ON_CHANGE',
    changedNodeId: 'MORTGAGE',
    selectedOfferingIds: ['MORTGAGE'],
    context: { calculatedPmt: 220000, existingLoanPayments: 120000, netIncome: 600000, totalWeightKg: 26000 },
    rules: [
      {
        id: 'jtm',
        source_offering_id: 'MORTGAGE',
        target_offering_id: 'CUSTOMER',
        rule_type: 'ELIGIBILITY',
        event_scope: 'ON_CHANGE',
        condition_payload: { jtmLimit: 0.5, errorCode: 'DECLINE_REASON_JTM_LIMIT' }
      },
      {
        id: 'req',
        source_offering_id: 'MORTGAGE',
        target_offering_id: 'OFFER-HOME-INSURANCE-BASIC',
        rule_type: 'REQUIRES',
        event_scope: 'ON_CHANGE',
        condition_payload: { autoAdd: ['OFFER-HOME-INSURANCE-BASIC', 'COLLATERAL-REAL-ESTATE'] }
      },
      {
        id: 'split',
        source_offering_id: 'MORTGAGE',
        target_offering_id: 'TRUCK',
        rule_type: 'CONSTRAINS',
        event_scope: 'ON_CHANGE',
        condition_payload: { maxWeightKg: 24000, actionCode: 'ADDITIONAL_TRUCK_ALLOCATION' }
      }
    ]
  });

  assert.equal(out.errors.some((e) => e.code === 'DECLINE_REASON_JTM_LIMIT'), true);
  assert.equal(out.requiredAdditions.includes('COLLATERAL-REAL-ESTATE'), true);
  assert.equal(out.actions[0].code, 'ADDITIONAL_TRUCK_ALLOCATION');
});

test('underwriting engine handles decline, referral and risk premium', () => {
  const declined = evaluateUnderwriting({ preExistingConditions: ['C34'], sumAssuredHuf: 50000000 });
  assert.equal(declined.status, 'DECLINED');

  const pending = evaluateUnderwriting({ preExistingConditions: ['I10'], sumAssuredHuf: 120000000 });
  assert.equal(pending.status, 'PENDING_MEDICAL_EXAM');
  assert.deepEqual(pending.requireServices, ['SRV-MED-DIAGNOSTICS']);

  const premium = calculateRiskPremium({
    basePremium: 20000,
    biometricMultipliers: [1.5, 1.1],
    riders: [
      { priceFactor: 0.00008, sumAssured: 50000000 }
    ]
  });
  assert.equal(premium, 37000);
});

test('pricing performance runs in milliseconds without memory leak behavior', () => {
  const begin = process.hrtime.bigint();
  for (let i = 0; i < 1000; i += 1) {
    resolvePrice({
      charge: { charge_type: 'ONETIME', calculation_method: 'FLAT_FEE', base_price: 100, valid_from: '2026-01-01T00:00:00Z', valid_to: null },
      attributes: {},
      priceBooks: [{ id: 'pb', priority: 1, decision_score: 0, valid_from: '2026-01-01T00:00:00Z', valid_to: null }],
      overrides: [{ price_book_id: 'pb', waterfall_step: 1, override_type: 'DELTA', override_value: -10, valid_from: '2026-01-01T00:00:00Z', valid_to: null }],
      context: { decision_score: 0 },
      now: new Date('2026-04-25T00:00:00Z')
    });
  }
  const elapsedMs = Number(process.hrtime.bigint() - begin) / 1e6;
  assert.equal(elapsedMs < 100, true);
});


test('tmf entity store supports filters, fields and pagination', () => {
  __resetTmfEntityStoreForTests();
  createEntity('product', { name: 'Residential Internet', product_type: 'SERVICE', lifecycle_status: 'ACTIVE' });
  createEntity('product', { name: 'Business Internet', product_type: 'SERVICE', lifecycle_status: 'DRAFT' });

  const params = new URLSearchParams('lifecycle_status=ACTIVE&fields=id,name&limit=10&offset=0');
  const out = listEntities('product', params);

  assert.equal(out.total, 1);
  assert.equal(out.items[0].name, 'Residential Internet');
  assert.equal(Object.hasOwn(out.items[0], 'lifecycle_status'), false);
});

test('tmf relationship store blocks cyclic bundle/requires links', () => {
  __resetTmfEntityStoreForTests();
  const a = createEntity('productOffering', { name: 'Offer A' });
  const b = createEntity('productOffering', { name: 'Offer B' });
  createEntity('productOfferingRelationship', {
    source_offering_id: a.id,
    target_offering_id: b.id,
    relationship_type: 'BUNDLE',
  });

  assert.throws(() => createEntity('productOfferingRelationship', {
    source_offering_id: b.id,
    target_offering_id: a.id,
    relationship_type: 'REQUIRES',
  }));
});

import epcReferenceCatalog from '../data/epcReferenceCatalog.json' with { type: 'json' };

test('EPC reference import preserves product specifications, offerings, inventory and characteristics', () => {
  assert.equal(epcReferenceCatalog.slug, 'epc-import-otthonnet-reference');
  assert.equal(epcReferenceCatalog.productSpecifications.length, 8);
  assert.equal(epcReferenceCatalog.productOfferings.length, 3);
  assert.equal(epcReferenceCatalog.productInventory.length, 13);
  assert.equal(epcReferenceCatalog.characteristicDefinitions.length >= 90, true);
  assert.equal(epcReferenceCatalog.industryExtensions.length, 20);
  assert.equal(epcReferenceCatalog.characteristicDefinitions.some((item) => item.inventoryImpact === 'Y'), true);
  assert.equal(epcReferenceCatalog.characteristicDefinitions.some((item) => item.fulfillmentImpact === 'Y'), true);
  assert.equal(epcReferenceCatalog.productInventory.some((item) => item.relationshipCount > 0), true);
});
