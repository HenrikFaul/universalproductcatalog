export const EPC_LIFECYCLE_STATUSES = ['Draft', 'In Test', 'Launched', 'Active', 'End of Sale', 'End of Life', 'Retired'];
export const EPC_VALUE_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'ENUM', 'DATE', 'DATETIME', 'JSON', 'MONEY'];
export const EPC_PRESENCE_TYPES = ['optional', 'mandatory', 'conditional', 'derived', 'readOnly'];
export const EPC_CONFIG_STAGES = ['catalog-design', 'quotation', 'sale', 'order-capture', 'fulfillment', 'inventory', 'assurance'];
export const EPC_CHANNELS = ['Web', 'Mobileapp', 'Backoffice', 'Partner', 'Call Center', 'Retail', 'API'];
export const EPC_CHARGE_TYPES = ['ONETIME', 'RECURRING', 'USAGE', 'ALLOWANCE', 'DISCOUNT'];
export const EPC_PRICE_METHODS = ['FLAT_FEE', 'PER_UNIT', 'TIERED', 'VOLUME', 'ATTRIBUTE_BASED', 'FORMULA'];
export const EPC_PRODUCT_STATUSES = ['Created', 'Active', 'Suspended', 'Terminated', 'Pending Activation', 'Cancelled'];

export const DEFAULT_PRODUCT_SPECIFICATION = {
  code: 'PS_NEW_PRODUCT',
  name: 'New Product Specification',
  caption: 'New Product Specification',
  description: '',
  type: 'ProductSpecification',
  category: 'ProductSpecification',
  lifecycle: 'Draft',
  lifecycleStatus: 'Draft',
  version: '1',
  isBundle: false,
  businessModel: 'Configurable',
  productType: 'SERVICE',
  brand: '',
  validForStart: '',
  validForEnd: '',
  fulfillmentSchema: '',
  cardinalityMin: 0,
  cardinalityMax: 1,
};

export const DEFAULT_PRODUCT_OFFERING = {
  code: 'PO_NEW_OFFERING',
  name: 'New Product Offering',
  caption: 'New Product Offering',
  description: '',
  specificationCode: '',
  lifecycleStatus: 'Draft',
  status: 'Draft',
  version: '1',
  isBundle: false,
  isSellable: true,
  saleType: 'new-sale',
  activationMode: 'automatic',
  requiresServiceAgreement: false,
  requiresFrameAgreement: false,
  channels: ['Web'],
  marketSegments: [],
  category: 'Offering',
  validForStart: '',
  validForEnd: '',
  validFor: 'open-ended',
  priceSummary: 'Define pricing',
  price: {
    name: 'Base recurring charge',
    chargeType: 'RECURRING',
    calculationMethod: 'FLAT_FEE',
    amount: 0,
    currency: 'HUF',
    recurrence: 'monthly',
    formula: '',
  },
  terms: [],
};

export const DEFAULT_PRODUCT_INVENTORY = {
  code: 'PR_NEW_PRODUCT',
  id: 'PR_NEW_PRODUCT',
  name: 'New Product Instance',
  productOfferingCode: '',
  productSpecificationCode: '',
  status: 'Created',
  lifecycleStatus: 'Created',
  productType: 'SERVICE',
  productSerialNumber: '',
  serviceId: '',
  msisdn: '',
  startDate: '',
  terminationDate: '',
  place: '',
  relatedParty: '',
  billingAccount: '',
  characteristicValues: {},
};

export const DEFAULT_CHARACTERISTIC_DEFINITION = {
  appliesTo: 'PS_NEW_PRODUCT',
  displayName: 'New characteristic',
  name: 'newCharacteristic',
  valueType: 'STRING',
  configurable: true,
  configurableStage: 'quotation',
  stage: 'quotation,sale',
  presence: 'optional',
  presenceMeaning: 'Optional unless a rule marks it mandatory.',
  minCardinality: 0,
  maxCardinality: 1,
  editingBehaviour: 'editable',
  defaultValue: '',
  allowedValues: [],
  inventoryImpact: 'stored-as-product-characteristic',
  fulfillmentImpact: 'available-for-service-decomposition',
  interpretation: '',
};

export function epcCodeFragment(value, fallback = 'ITEM') {
  const normalized = String(value || fallback)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
}

export function createProductSpecificationDraft(index = 0, templateSlug = 'generic') {
  const suffix = `${epcCodeFragment(templateSlug, 'GENERIC')}_${index + 1}`;
  return {
    ...DEFAULT_PRODUCT_SPECIFICATION,
    code: `PS_${suffix}`,
    name: `Product Specification ${index + 1}`,
    caption: `Product Specification ${index + 1}`,
  };
}

export function createProductOfferingDraft(index = 0, primarySpecCode = '', templateSlug = 'generic') {
  const suffix = `${epcCodeFragment(templateSlug, 'GENERIC')}_${index + 1}`;
  return {
    ...DEFAULT_PRODUCT_OFFERING,
    code: `PO_${suffix}`,
    name: `Product Offering ${index + 1}`,
    caption: `Product Offering ${index + 1}`,
    specificationCode: primarySpecCode,
  };
}

export function createProductInventoryDraft(index = 0, primaryOfferingCode = '', primarySpecCode = '', templateSlug = 'generic') {
  const suffix = `${epcCodeFragment(templateSlug, 'GENERIC')}_${index + 1}`;
  return {
    ...DEFAULT_PRODUCT_INVENTORY,
    code: `PR_${suffix}`,
    id: `PR_${suffix}`,
    name: `Product Instance ${index + 1}`,
    productOfferingCode: primaryOfferingCode,
    productSpecificationCode: primarySpecCode,
  };
}
