import { buildTimeTravelFilter } from '../backend/effectiveDating.js';

/**
 * TMF620-inspired headless API contract builder.
 * Separation: ProductSpecification (what) vs ProductOffering (how sold).
 */
export function listProductSpecifications({ at = 'NOW()' } = {}) {
  return {
    entity: 'ProductSpecification',
    tmfResource: '/tmf-api/productCatalogManagement/v4/productSpecification',
    filter: buildTimeTravelFilter(at)
  };
}

export function listProductOfferings({ at = 'NOW()' } = {}) {
  return {
    entity: 'ProductOffering',
    tmfResource: '/tmf-api/productCatalogManagement/v4/productOffering',
    filter: buildTimeTravelFilter(at)
  };
}

export function inheritanceChain(spec, specById) {
  const chain = [];
  let cursor = spec;
  while (cursor) {
    chain.unshift(cursor.id);
    cursor = cursor.parent_specification_id ? specById.get(cursor.parent_specification_id) : null;
  }
  return chain;
}

export function cpqAndOrderEndpoints() {
  return {
    cpq: ['/tmf-api/productCatalogManagement/v4/productOffering', '/tmf-api/productCatalogManagement/v4/productSpecification'],
    orderManagement: ['/tmf-api/productOrdering/v4/productOrder'],
    crmErpSync: ['/headless/integration/catalog/export']
  };
}
