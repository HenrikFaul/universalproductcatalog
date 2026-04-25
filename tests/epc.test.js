import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFormula } from '../src/backend/formulaEngine.js';
import { resolvePrice } from '../src/backend/pricingEngine.js';
import { evaluateRules } from '../src/backend/rulesEngine.js';
import { canMutateJson, sanitizeDynamicAttributes } from '../src/backend/jsonSecurity.js';
import { buildTimeTravelFilter, closeAndCreateMajorVersion, createMinorVersion } from '../src/backend/effectiveDating.js';

test('formula engine evaluates ABP expression without eval', () => {
  const amount = evaluateFormula('attributes.speed * 0.5 + attributes.term', { attributes: { speed: 1000, term: 24 } });
  assert.equal(amount, 524);
});

test('pricing waterfall applies price book overrides in order', () => {
  const now = new Date('2026-04-25T00:00:00Z');
  const price = resolvePrice({
    charge: {
      charge_type: 'RECURRING',
      base_price: 10,
      abp_formula: 'attributes.users * 2',
      valid_from: '2026-01-01T00:00:00Z',
      valid_to: null
    },
    attributes: { users: 5 },
    priceBooks: [{ id: 'book-a', priority: 1, valid_from: '2026-01-01T00:00:00Z', valid_to: null }],
    overrides: [
      { price_book_id: 'book-a', waterfall_step: 1, override_type: 'DELTA', override_value: -1, valid_from: '2026-01-01T00:00:00Z', valid_to: null },
      { price_book_id: 'book-a', waterfall_step: 2, override_type: 'PERCENT', override_value: -0.1, valid_from: '2026-01-01T00:00:00Z', valid_to: null }
    ],
    now
  });

  assert.equal(price.amount, 8.1);
});

test('rules engine enforces requires/excludes/constrains', () => {
  const out = evaluateRules({
    event: 'ON_CHANGE',
    changedNodeId: 'A',
    selectedOfferingIds: ['A', 'C'],
    rules: [
      { source_offering_id: 'A', target_offering_id: 'B', rule_type: 'REQUIRES', event_scope: 'ON_CHANGE', condition_payload: {} },
      { source_offering_id: 'A', target_offering_id: 'C', rule_type: 'EXCLUDES', event_scope: 'ON_CHANGE', condition_payload: {} },
      { source_offering_id: 'A', target_offering_id: 'C', rule_type: 'CONSTRAINS', event_scope: 'ON_CHANGE', condition_payload: { maxQty: 1, sourceQty: 3 } }
    ]
  });

  assert.equal(out.errors.length, 3);
  assert.deepEqual(out.disabled, ['C']);
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

test('pricing performance runs in milliseconds', () => {
  const begin = process.hrtime.bigint();
  for (let i = 0; i < 1000; i += 1) {
    resolvePrice({
      charge: { charge_type: 'ONETIME', base_price: 100, valid_from: '2026-01-01T00:00:00Z', valid_to: null },
      attributes: {},
      priceBooks: [{ id: 'pb', priority: 1, valid_from: '2026-01-01T00:00:00Z', valid_to: null }],
      overrides: [{ price_book_id: 'pb', waterfall_step: 1, override_type: 'DELTA', override_value: -10, valid_from: '2026-01-01T00:00:00Z', valid_to: null }],
      now: new Date('2026-04-25T00:00:00Z')
    });
  }
  const elapsedMs = Number(process.hrtime.bigint() - begin) / 1e6;
  assert.equal(elapsedMs < 100, true);
});
