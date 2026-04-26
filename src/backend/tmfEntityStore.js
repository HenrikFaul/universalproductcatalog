import crypto from 'node:crypto';
import { OFFERING_RELATIONSHIP_TYPES, TMF_ENTITY_CONFIG } from '../types/tmf620Entities.js';

const db = new Map(Object.keys(TMF_ENTITY_CONFIG).map((key) => [key, []]));

function nowIso() {
  return new Date().toISOString();
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function ensureEntity(entity) {
  if (!TMF_ENTITY_CONFIG[entity]) {
    const error = new Error(`Unknown TMF entity: ${entity}`);
    error.status = 404;
    throw error;
  }
}

function pickFields(item, fields) {
  if (!fields?.length) return item;
  return fields.reduce((acc, field) => {
    if (Object.hasOwn(item, field)) acc[field] = item[field];
    return acc;
  }, {});
}

function matchesFilter(item, filters) {
  return Object.entries(filters).every(([key, value]) => String(item[key]) === String(value));
}

function parseListParams(searchParams) {
  const params = Object.fromEntries(searchParams.entries());
  const offset = Math.max(0, Number(params.offset ?? 0));
  const limit = Math.min(200, Math.max(1, Number(params.limit ?? 50)));
  const fields = (params.fields || '').split(',').map((v) => v.trim()).filter(Boolean);

  const filters = { ...params };
  delete filters.offset;
  delete filters.limit;
  delete filters.fields;

  return { offset, limit, fields, filters };
}

function validateRelationshipPayload(payload) {
  if (!OFFERING_RELATIONSHIP_TYPES.has(payload.relationship_type)) {
    const error = new Error('Invalid relationship_type. Allowed: BUNDLE, UPSELL, CROSS_SELL, EXCLUDES, REQUIRES');
    error.status = 400;
    throw error;
  }

  if (payload.source_offering_id === payload.target_offering_id) {
    const error = new Error('source_offering_id and target_offering_id must differ.');
    error.status = 400;
    throw error;
  }

  const offerings = db.get('productOffering');
  const sourceExists = offerings.some((item) => item.id === payload.source_offering_id);
  const targetExists = offerings.some((item) => item.id === payload.target_offering_id);

  if (!sourceExists || !targetExists) {
    const error = new Error('Referenced product offering does not exist.');
    error.status = 409;
    throw error;
  }

  const relationships = db.get('productOfferingRelationship');
  const directed = relationships
    .filter((item) => item.relationship_type === 'BUNDLE' || item.relationship_type === 'REQUIRES')
    .map((item) => [item.source_offering_id, item.target_offering_id]);

  directed.push([payload.source_offering_id, payload.target_offering_id]);

  const adjacency = new Map();
  directed.forEach(([from, to]) => {
    const next = adjacency.get(from) || [];
    next.push(to);
    adjacency.set(from, next);
  });

  const stack = [payload.target_offering_id];
  const visited = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    if (current === payload.source_offering_id) {
      const error = new Error('Cyclic relationship detected (A→B and B→A is forbidden).');
      error.status = 409;
      throw error;
    }
    visited.add(current);
    (adjacency.get(current) || []).forEach((next) => stack.push(next));
  }
}

export function listEntities(entity, searchParams) {
  ensureEntity(entity);
  const { offset, limit, fields, filters } = parseListParams(searchParams);
  const records = db.get(entity).filter((item) => !item.deleted_at).filter((item) => matchesFilter(item, filters));
  const sliced = records.slice(offset, offset + limit).map((item) => pickFields(item, fields));
  return {
    total: records.length,
    offset,
    limit,
    items: clone(sliced),
  };
}

export function createEntity(entity, payload) {
  ensureEntity(entity);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const error = new Error('Invalid JSON body.');
    error.status = 400;
    throw error;
  }

  if (entity === 'productOfferingRelationship') {
    validateRelationshipPayload(payload);
  }

  const { uniqueField } = TMF_ENTITY_CONFIG[entity];
  const items = db.get(entity);

  if (uniqueField && payload[uniqueField]) {
    const duplicate = items.find((item) => item[uniqueField] === payload[uniqueField] && !item.deleted_at);
    if (duplicate) {
      const error = new Error(`Duplicate ${uniqueField} for entity ${entity}.`);
      error.status = 409;
      throw error;
    }
  }

  const created = {
    id: payload.id || crypto.randomUUID(),
    ...payload,
    created_at: payload.created_at || nowIso(),
    updated_at: payload.updated_at || nowIso(),
    lifecycle_status: payload.lifecycle_status || payload.status || 'DRAFT',
  };

  items.push(created);
  return clone(created);
}

export function updateEntity(entity, id, payload) {
  ensureEntity(entity);
  const items = db.get(entity);
  const index = items.findIndex((item) => item.id === id && !item.deleted_at);
  if (index === -1) {
    const error = new Error(`Entity not found: ${entity}/${id}`);
    error.status = 404;
    throw error;
  }

  const merged = {
    ...items[index],
    ...payload,
    id,
    updated_at: nowIso(),
  };

  if (entity === 'productOfferingRelationship') {
    validateRelationshipPayload(merged);
  }

  items[index] = merged;
  return clone(merged);
}

export function deleteEntity(entity, id) {
  ensureEntity(entity);
  const items = db.get(entity);
  const index = items.findIndex((item) => item.id === id && !item.deleted_at);
  if (index === -1) {
    const error = new Error(`Entity not found: ${entity}/${id}`);
    error.status = 404;
    throw error;
  }

  items[index] = {
    ...items[index],
    deleted_at: nowIso(),
    lifecycle_status: 'RETIRED',
    updated_at: nowIso(),
  };

  return { id, retired: true };
}

export function __resetTmfEntityStoreForTests() {
  db.forEach((_, key) => db.set(key, []));
}
