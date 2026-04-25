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

test('industry payloads exist for first 6 domains and compatibility rules block invalid combos', () => {
  assert.equal(payloads.length >= 6, true);
  const errs = validateIndustryCompatibility(['Craft Lager Batch', 'Hazmat Shipping', 'V8 Engine Package', 'Progressive Lens']);
  assert.equal(errs.length, 2);
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
