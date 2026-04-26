export const TMF_ENTITY_CONFIG = {
  product: { table: 'epc_product', uniqueField: 'name' },
  productSpecification: { table: 'epc_product_specification', uniqueField: 'product_number' },
  serviceSpecification: { table: 'epc_service_specification', uniqueField: 'name' },
  productOffering: { table: 'epc_product_offering', uniqueField: 'name' },
  productCatalog: { table: 'epc_product_catalog', uniqueField: 'name' },
  productOfferingPrice: { table: 'epc_product_offering_price', uniqueField: 'name' },
  productOfferingRelationship: { table: 'epc_product_offering_relationship', uniqueField: null },
  characteristic: { table: 'epc_characteristic', uniqueField: 'name' },
  characteristicValue: { table: 'epc_characteristic_value', uniqueField: null },
  productCatalogCategory: { table: 'epc_catalog_category', uniqueField: 'name' },
  productOfferingTerm: { table: 'epc_product_offering_term', uniqueField: null },
  priceAlteration: { table: 'epc_price_alteration', uniqueField: null },
  productSpecificationRelationship: { table: 'epc_product_spec_relationship', uniqueField: null },
  resourceSpecification: { table: 'epc_resource_specification', uniqueField: 'name' },
};

export const OFFERING_RELATIONSHIP_TYPES = new Set(['BUNDLE', 'UPSELL', 'CROSS_SELL', 'EXCLUDES', 'REQUIRES']);
