import industryPayloads from '../../data/industryPayloads.json';
import epcBundles from '../../data/epcBundles.json';

export const modules = [
  {
    slug: 'epc-metamodel',
    title: 'EPC Metamodel',
    summary: 'Core relational catalog model with Product / Offering / Resource / Service separation and BOM-ready structure.',
    status: 'Implemented',
    description:
      'Provides the core enterprise catalog metamodel, specification separation and EPC-aligned structure needed for configurable product catalogs across multiple industries.',
    highlights: [
      'Product Specification, Product Offering, Resource Specification and Service Specification separation',
      'Schema foundation for BOM cardinality and composable bundle structures',
      'TMF620/TMF620-style modeling baseline for reusable product catalogs',
    ],
    sourceFiles: ['db/schema.sql', 'src/api/tmf620.js'],
    relatedIndustries: ['Telecom', 'Automotive', 'Banking', 'Logistics', 'Brewery', 'Optics', 'InsurTech'],
  },
  {
    slug: 'dynamic-attributes-ui',
    title: 'Dynamic Attributes & Schema UI',
    summary: 'Hybrid relational + JSONB attribute model with schema-driven dynamic form rendering.',
    status: 'Implemented',
    description:
      'Enables highly configurable industry-specific attributes without hardcoding every vertical field into the physical schema.',
    highlights: [
      'Hybrid EAV + JSONB contract for dynamic attributes',
      'Dynamic grouped UI renderer with validation extraction',
      'Secure JSON mutation and sanitization helpers',
    ],
    sourceFiles: [
      'src/frontend/schemaUiEngine.js',
      'src/frontend/DynamicFormRenderer.jsx',
      'src/backend/jsonSecurity.js',
    ],
    relatedIndustries: ['Telecom', 'Banking', 'Logistics', 'Brewery', 'Optics', 'InsurTech'],
  },
  {
    slug: 'pricing-engine',
    title: 'Pricing Engine',
    summary: 'Supports flat fee, per-unit, tiered and attribute-based pricing with price-book waterfall overrides.',
    status: 'Implemented',
    description:
      'Handles configurable commercial logic with a secure AST-based formula evaluator and decision-matrix-driven price-book selection.',
    highlights: [
      'Secure AST formula evaluation without eval()',
      'Decision-matrix price-book selection and waterfall overrides',
      'Finance and vertical pricing helpers for domain-specific pricing',
    ],
    sourceFiles: [
      'src/backend/formulaEngine.js',
      'src/backend/pricingEngine.js',
      'src/backend/financeEngine.js',
      'src/backend/verticalPricing.js',
    ],
    relatedIndustries: ['Telecom', 'Banking', 'Logistics', 'Brewery', 'Optics'],
  },
  {
    slug: 'rules-engine',
    title: 'Rules Engine',
    summary: 'Eligibility, requires, excludes and constrains validation with working-memory style evaluation.',
    status: 'Implemented',
    description:
      'Executes rule semantics for configurable offerings and can drive disabled states, hard-stops and recommendation outputs.',
    highlights: [
      'REQUIRES, EXCLUDES, CONSTRAINS and ELIGIBILITY support',
      'Working memory tracking and latency reporting',
      'UI-oriented action outputs for downstream rendering',
    ],
    sourceFiles: ['src/backend/rulesEngine.js'],
    relatedIndustries: ['Telecom', 'Banking', 'Logistics', 'InsurTech'],
  },
  {
    slug: 'effective-dating-versioning',
    title: 'Effective Dating & Versioning',
    summary: 'Time-travel and major/minor version helpers for catalog lifecycle management.',
    status: 'Implemented',
    description:
      'Supports valid_from / valid_to based lifecycle handling and safe version transitions for governed catalog evolution.',
    highlights: [
      'Time-travel filter helpers',
      'Major/minor version operations',
      'Overlap protection notes and lifecycle-aware schema usage',
    ],
    sourceFiles: ['src/backend/effectiveDating.js', 'db/schema.sql'],
    relatedIndustries: ['Telecom', 'Automotive', 'Banking', 'Logistics', 'Brewery', 'Optics', 'InsurTech'],
  },
  {
    slug: 'tmf620-headless-api',
    title: 'TMF620-style Headless API',
    summary: 'API scaffolding and helper functions to expose catalog structures in a headless integration-friendly form.',
    status: 'Implemented',
    description:
      'Provides listing and inheritance helpers around TMF620-inspired exposure patterns so the catalog can be consumed by external systems.',
    highlights: [
      'Listing helpers for product specifications and offerings',
      'Inheritance chain helpers',
      'CPQ / ordering facing endpoint scaffolding',
    ],
    sourceFiles: ['src/api/tmf620.js'],
    relatedIndustries: ['Telecom', 'Automotive', 'Banking', 'Logistics'],
  },
  {
    slug: 'vertical-industry-extensions',
    title: 'Vertical Industry Extensions',
    summary: 'Industry examples and vertical calculation helpers already wired into the domain layer.',
    status: 'Implemented',
    description:
      'Extends the generic catalog platform with concrete industry payloads and vertical computation helpers across multiple sectors.',
    highlights: [
      'Industry payload examples across 7 sectors',
      'Mortgage / underwriting / cold-chain / optics / brewery logic',
      'Cross-industry compatibility validation',
    ],
    sourceFiles: [
      'data/industryPayloads.json',
      'data/epcBundles.json',
      'src/backend/financeEngine.js',
      'src/backend/verticalPricing.js',
      'src/backend/underwritingEngine.js',
      'src/validation/industryCompatibility.js',
    ],
    relatedIndustries: ['Telecom', 'Automotive', 'Banking', 'Logistics', 'Brewery', 'Optics', 'InsurTech'],
  },
];

export const industryTemplates = [
  { slug: 'telecommunications', title: 'Telekommunikáció (B2C + B2B)', focus: '5G mobil, optikai internet, bérelt vonal, IoT', starterProducts: ['Mobile tariff', 'Fiber internet bundle', 'IoT connectivity package'], starterServices: ['Broadband access', 'Voice', 'Managed WiFi'], starterResources: ['SIM', 'ONT', 'WiFi router'] },
  { slug: 'automotive', title: 'Autógyártás és OEM', focus: 'Járműkonfiguráció, motor, extra, digitális szolgáltatás', starterProducts: ['Vehicle model', 'Engine package', 'Connected services'], starterServices: ['Warranty', 'Remote diagnostics', 'Connected navigation'], starterResources: ['Chassis', 'Battery', 'Sensor suite'] },
  { slug: 'banking', title: 'Pénzügyi szolgáltatások és bank', focus: 'Lakáshitel, számlacsomag, hitelkártya, befektetés', starterProducts: ['Mortgage plan', 'Current account package', 'Credit card'], starterServices: ['Risk assessment', 'KYC', 'Card fulfillment'], starterResources: ['Card stock', 'Credit limit', 'Collateral'] },
  { slug: 'logistics', title: 'Logisztika és szállítmányozás', focus: 'Konténeres szállítás, cold-chain, fulfillment', starterProducts: ['Freight shipment', 'Cold storage contract', 'Fulfillment package'], starterServices: ['Route planning', 'Warehouse handling', 'Temperature monitoring'], starterResources: ['Container', 'Truck capacity', 'Warehouse slot'] },
  { slug: 'brewery', title: 'Sör- és italgyártás', focus: 'Komló, maláta, főzőberendezés, hordós csomagok', starterProducts: ['Raw material batch', 'Brewing equipment', 'Keg sales package'], starterServices: ['Quality lab', 'Fermentation support', 'Distribution'], starterResources: ['Hops', 'Malt', 'Fermentation tank'] },
  { slug: 'optics', title: 'Optika és finommechanika', focus: 'Lencse, keret, bevonat, multifokális konfiguráció', starterProducts: ['Lens package', 'Frame package', 'Surface coating'], starterServices: ['Prescription validation', 'Manufacturing', 'Store fitting'], starterResources: ['Lens blank', 'Frame', 'Coating material'] },
  { slug: 'health-insurance', title: 'Egészségügy és biztosítás', focus: 'Egészségcsomag, életbiztosítás, kockázati árazás', starterProducts: ['Care package', 'Life policy', 'Accident cover'], starterServices: ['Claim handling', 'Medical network access', 'Risk scoring'], starterResources: ['Coverage limit', 'Medical provider network', 'Policy document'] },
  { slug: 'energy-utilities', title: 'Energia és közművek', focus: 'Áram, gáz, smart grid, napelem', starterProducts: ['Residential energy plan', 'Industrial supply contract', 'Solar installation'], starterServices: ['Metering', 'Field service', 'Energy balancing'], starterResources: ['Meter', 'Grid connection', 'Solar panel kit'] },
  { slug: 'saas-cloud', title: 'Szoftver, SaaS és felhő', focus: 'IaaS/PaaS, licenc, erőforrás-előfizetés', starterProducts: ['Cloud tenant plan', 'Database cluster', 'SaaS seat bundle'], starterServices: ['Provisioning', 'Monitoring', 'Support plan'], starterResources: ['CPU', 'RAM', 'Storage'] },
  { slug: 'industrial-machinery', title: 'Ipari gépgyártás és nehézipar', focus: 'CNC, gyártósor, BOM, karbantartás', starterProducts: ['Machine line', 'Maintenance contract', 'Spare parts package'], starterServices: ['Installation', 'Preventive maintenance', 'Remote support'], starterResources: ['Controller', 'Motor', 'Spare part inventory'] },
  { slug: 'media-entertainment', title: 'Média és szórakoztatóipar', focus: 'Streaming, digitális hirdetés, kampánycsomag', starterProducts: ['Streaming subscription', 'Ad inventory package', 'Campaign bundle'], starterServices: ['Audience analytics', 'Content delivery', 'Campaign management'], starterResources: ['License', 'CDN capacity', 'Ad slot'] },
  { slug: 'real-estate-facility', title: 'Kereskedelmi ingatlan és facility', focus: 'Bérlet, takarítás, üzemeltetés', starterProducts: ['Office lease package', 'Facility service bundle', 'Meeting room bundle'], starterServices: ['Cleaning', 'HVAC maintenance', 'Security desk'], starterResources: ['Floor space', 'Badge access', 'Utility allocation'] },
  { slug: 'travel-airline', title: 'Légitársaságok és utazás', focus: 'Jegy, poggyász, lounge, csomagár', starterProducts: ['Flight fare', 'Baggage add-on', 'Premium travel bundle'], starterServices: ['Check-in', 'Lounge access', 'Rebooking'], starterResources: ['Seat', 'Baggage allowance', 'Boarding group'] },
  { slug: 'pharma', title: 'Gyógyszeripar', focus: 'Klinikai csomag, disztribúció, kompatibilitás', starterProducts: ['Clinical trial service', 'Distribution contract', 'Drug batch'], starterServices: ['Cold chain handling', 'Regulatory compliance', 'Recall support'], starterResources: ['Batch', 'Temperature log', 'Storage lot'] },
  { slug: 'education-edtech', title: 'Oktatás és e-learning', focus: 'Szemeszter, kredit, vállalati képzés', starterProducts: ['Course catalog', 'Semester package', 'Corporate training bundle'], starterServices: ['Enrollment', 'Assessment', 'Certificate issuance'], starterResources: ['Seat', 'Content license', 'Tutor hours'] },
  { slug: 'agrotech', title: 'Mezőgazdaság és Agrotech', focus: 'Okos-farm IoT, vetőmag, műtrágya, gépbérlés', starterProducts: ['Farm IoT package', 'Seed contract', 'Machinery lease'], starterServices: ['Field monitoring', 'Maintenance', 'Agronomy support'], starterResources: ['Sensor kit', 'Seed batch', 'Lease unit'] },
  { slug: 'it-hardware-integration', title: 'IT hardver és rendszerintegráció', focus: 'Szerver rack, DC infra, hűtés', starterProducts: ['Rack configuration', 'Data center bundle', 'Integration project'], starterServices: ['Installation', 'Migration', 'Managed operations'], starterResources: ['Server', 'Switch', 'Cooling unit'] },
  { slug: 'security-surveillance', title: 'Biztonságtechnika és távfelügyelet', focus: 'CCTV, riasztó, 0-24 monitoring', starterProducts: ['CCTV package', 'Alarm bundle', 'Remote monitoring contract'], starterServices: ['Dispatch', 'Monitoring', 'On-site maintenance'], starterResources: ['Camera', 'Recorder', 'Sensor'] },
  { slug: 'chemical', title: 'Vegyipar', focus: 'Keverékek, veszélyes áru, környezetvédelmi validáció', starterProducts: ['Chemical blend', 'Hazmat shipment', 'Supply contract'], starterServices: ['Compliance checking', 'Transport', 'Lab analysis'], starterResources: ['Lot', 'MSDS', 'Tank'] },
  { slug: 'events-hospitality', title: 'Rendezvényszervezés és vendéglátás', focus: 'Terem, catering, hosztesz, technika', starterProducts: ['Conference package', 'Catering package', 'AV support bundle'], starterServices: ['Event management', 'On-site support', 'Venue operations'], starterResources: ['Room', 'Equipment', 'Staff allocation'] },
];

export const demoCatalogs = [
  {
    slug: 'telecom-demo',
    title: 'Telecom demo catalog',
    industry: 'Telecom',
    tmfVersion: 'TMF620 v4/v5 aligned logical structure',
    description:
      'A telecom-focused but universally reusable EPC/TMF620 starter catalog that demonstrates product specification, product offering, service specification, resource specification and characteristic-definition separation.',
    catalog: {
      code: 'UPC-TELCO-DEMO',
      version: '1.0.0',
      validFor: '2026-01-01 / open-ended',
      businessDomains: ['B2C Fixed Internet', 'B2C TV add-ons', 'CPE / device bundle'],
    },
    productSpecifications: [
      { code: 'PS_WIRED_INTERNET', name: 'Wired Internet', type: 'Bundle-capable ProductSpecification', lifecycle: 'Launched', businessModel: 'Subscription', category: 'Fixed connectivity', summary: 'Commercial product shell for fixed broadband with optional TV and device components.' },
      { code: 'PS_INTERNET_PLAN', name: 'Internet Plan', type: 'ProductSpecification', lifecycle: 'Launched', businessModel: 'Subscription', category: 'Access service', summary: 'Bandwidth profile and access policy definition.' },
      { code: 'PS_CPE_ROUTER', name: 'CPE Router', type: 'ProductSpecification', lifecycle: 'Launched', businessModel: 'Hardware', category: 'Device', summary: 'Customer premise equipment used for service activation and inventory linkage.' },
      { code: 'PS_TV_ADDON', name: 'TV Add-on', type: 'ProductSpecification', lifecycle: 'Launched', businessModel: 'Subscription', category: 'Entertainment', summary: 'Optional TV package that can be sold as bundle child.' },
      { code: 'PS_CHILD_PROTECTION', name: 'Children Protection', type: 'ProductSpecification', lifecycle: 'Draft', businessModel: 'Digital add-on', category: 'Value added service', summary: 'Optional content-filtering add-on for the access bundle.' },
    ],
    productOfferings: [
      { code: 'PO_HOMENET_FIBER_1000', name: 'HomeNet Fiber 1000', specificationCode: 'PS_WIRED_INTERNET', status: 'Launched', validFor: '2026-01-01 / 2026-12-31', tags: ['homeNet', 'fiber', 'bundle'], channels: ['Web', 'Retail', 'Call center'], priceSummary: 'HUF 8,990 monthly + install fee', summary: 'Primary demo product offering for the telecom starter catalog.' },
      { code: 'PO_HOMENET_LITE_500', name: 'HomeNet Lite 500', specificationCode: 'PS_WIRED_INTERNET', status: 'Launched', validFor: '2026-01-01 / open-ended', tags: ['lite', 'fiber'], channels: ['Web', 'Retail'], priceSummary: 'HUF 6,490 monthly', summary: 'Lower bandwidth variant on the same underlying product specification.' },
      { code: 'PO_TV_BUNDLE_PLUS', name: 'TV Bundle Plus', specificationCode: 'PS_TV_ADDON', status: 'Offered', validFor: '2026-01-01 / open-ended', tags: ['tv', 'addon'], channels: ['Web', 'Retail'], priceSummary: 'HUF 2,990 monthly', summary: 'Optional entertainment add-on mapped to the same universal catalog structure.' },
    ],
    serviceSpecifications: [
      { code: 'SS_BROADBAND_ACCESS', name: 'Broadband Access Service', serviceType: 'CFS', summary: 'Logical customer-facing internet access service.' },
      { code: 'SS_MANAGED_WIFI', name: 'Managed WiFi', serviceType: 'CFS', summary: 'Optional managed WiFi service coupled to the CPE.' },
      { code: 'SS_IPTV', name: 'IPTV Service', serviceType: 'CFS', summary: 'TV transport and entitlement service.' },
    ],
    resourceSpecifications: [
      { code: 'RS_ONT', name: 'ONT Device', resourceType: 'PhysicalResource', summary: 'Fiber termination device bound to fulfillment and inventory.' },
      { code: 'RS_WIFI_ROUTER', name: 'WiFi Router', resourceType: 'PhysicalResource', summary: 'Home router tracked in inventory and service activation.' },
      { code: 'RS_VLAN_PROFILE', name: 'VLAN Profile', resourceType: 'LogicalResource', summary: 'Provisioning profile for broadband traffic separation.' },
    ],
    hierarchy: [
      { parent: 'PS_WIRED_INTERNET', child: 'PS_INTERNET_PLAN', min: 1, max: 1, defaultQty: 1 },
      { parent: 'PS_WIRED_INTERNET', child: 'PS_CPE_ROUTER', min: 1, max: 1, defaultQty: 1 },
      { parent: 'PS_WIRED_INTERNET', child: 'PS_TV_ADDON', min: 0, max: 1, defaultQty: 0 },
      { parent: 'PS_WIRED_INTERNET', child: 'PS_CHILD_PROTECTION', min: 0, max: 1, defaultQty: 0 },
    ],
    characteristicDefinitions: [
      { appliesTo: 'PS_WIRED_INTERNET', name: 'downloadBandwidthMbps', displayName: 'Download bandwidth (Mbps)', valueType: 'NUMBER', presence: 'mandatoryForSale', presenceMeaning: 'Required at quotation and order entry', minCardinality: 1, maxCardinality: 1, configurable: true, configurableStage: 'quotation,sale,acceptance', editingBehaviour: 'editable', defaultValue: 1000, allowedValues: [100, 500, 1000, 2000], inventoryImpact: 'Y', fulfillmentImpact: 'Y', interpretation: 'Commercial bandwidth profile exposed to CPQ and translated to service/resource parameters.' },
      { appliesTo: 'PS_WIRED_INTERNET', name: 'contractTermMonths', displayName: 'Contract term', valueType: 'ENUM', presence: 'mandatoryForSale', presenceMeaning: 'Must be selected before submit', minCardinality: 1, maxCardinality: 1, configurable: true, configurableStage: 'quotation,sale', editingBehaviour: 'editable', defaultValue: 24, allowedValues: [12, 24], inventoryImpact: 'N', fulfillmentImpact: 'N', interpretation: 'Commercial term driving discounts and commitment rules.' },
      { appliesTo: 'PS_CPE_ROUTER', name: 'routerModel', displayName: 'Router model', valueType: 'STRING', presence: 'mandatoryForFulfillment', presenceMeaning: 'Required for activation and shipment', minCardinality: 1, maxCardinality: 1, configurable: false, configurableStage: 'fulfillment,inventory', editingBehaviour: 'readonly', defaultValue: 'ZXHN F6745', allowedValues: ['ZXHN F6745', 'ZXHN F680'], inventoryImpact: 'Y', fulfillmentImpact: 'Y', interpretation: 'Inventory-facing hardware identifier used for warehouse and service activation.' },
      { appliesTo: 'PS_CPE_ROUTER', name: 'serialNumber', displayName: 'Serial number', valueType: 'STRING', presence: 'mandatoryForFulfillment', presenceMeaning: 'Placeholder at order, concrete value during fulfillment', minCardinality: 1, maxCardinality: 1, configurable: false, configurableStage: 'fulfillment,inventory', editingBehaviour: 'readonly', defaultValue: null, allowedValues: [], inventoryImpact: 'Y', fulfillmentImpact: 'Y', interpretation: 'Populated from inventory during delivery and installation.' },
      { appliesTo: 'PS_TV_ADDON', name: 'channelPackage', displayName: 'Channel package', valueType: 'ENUM', presence: 'optional', presenceMeaning: 'Optional upsell within the internet bundle', minCardinality: 0, maxCardinality: 1, configurable: true, configurableStage: 'quotation,sale,acceptance', editingBehaviour: 'editable', defaultValue: 'Family', allowedValues: ['Family', 'Premium', 'Sports'], inventoryImpact: 'N', fulfillmentImpact: 'Y', interpretation: 'Commercial add-on later mapped to IPTV service entitlements.' },
      { appliesTo: 'PS_INTERNET_PLAN', name: 'accessTechnology', displayName: 'Access technology', valueType: 'ENUM', presence: 'mandatoryForSale', presenceMeaning: 'Selected by coverage and network eligibility', minCardinality: 1, maxCardinality: 1, configurable: true, configurableStage: 'quotation,sale', editingBehaviour: 'editable', defaultValue: 'FTTH', allowedValues: ['FTTH', 'DOCSIS', 'xDSL'], inventoryImpact: 'Y', fulfillmentImpact: 'Y', interpretation: 'Universal technology selector useful later for any industry-specific technical product split.' },
      { appliesTo: 'PS_CHILD_PROTECTION', name: 'contentFilterLevel', displayName: 'Content filter level', valueType: 'ENUM', presence: 'optional', presenceMeaning: 'Optional family protection control', minCardinality: 0, maxCardinality: 1, configurable: true, configurableStage: 'sale,acceptance', editingBehaviour: 'editable', defaultValue: 'Standard', allowedValues: ['Standard', 'Strict'], inventoryImpact: 'N', fulfillmentImpact: 'Y', interpretation: 'Demonstrates optional digital service characteristics.' },
    ],
    serviceMapping: [
      { productSpec: 'PS_WIRED_INTERNET', serviceSpec: 'SS_BROADBAND_ACCESS', resourceSpecs: ['RS_ONT', 'RS_VLAN_PROFILE'] },
      { productSpec: 'PS_CPE_ROUTER', serviceSpec: 'SS_MANAGED_WIFI', resourceSpecs: ['RS_WIFI_ROUTER'] },
      { productSpec: 'PS_TV_ADDON', serviceSpec: 'SS_IPTV', resourceSpecs: [] },
    ],
    tmf620Examples: {
      productSpecification: {
        '@type': 'ProductSpecification',
        id: 'PS_WIRED_INTERNET',
        name: 'Wired Internet',
        lifecycleStatus: 'Launched',
        productNumber: 'UPC-TELCO-PS-001',
        version: '1.0',
        isBundle: true,
      },
      productOffering: {
        '@type': 'ProductOffering',
        id: 'PO_HOMENET_FIBER_1000',
        name: 'HomeNet Fiber 1000',
        lifecycleStatus: 'Launched',
        productOfferingPrice: [
          { priceType: 'recurring', unitOfMeasure: 'month', price: { taxIncludedAmount: { unit: 'HUF', value: 8990 } } },
        ],
        productSpecification: { id: 'PS_WIRED_INTERNET', name: 'Wired Internet' },
      },
    },
  },
];

function safeSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getIndustryPayloads() {
  return industryPayloads;
}

export function getEpcBundles() {
  return epcBundles;
}

export function getIndustrySummaries() {
  const grouped = new Map();

  for (const payload of industryPayloads) {
    const industry = payload.industry;
    const slug = safeSlug(industry);
    const current = grouped.get(slug) ?? {
      slug,
      industry,
      offerings: [],
      attributes: new Set(),
      configurableCount: 0,
    };

    current.offerings.push(payload);

    const dynamicAttributes = payload.dynamic_attributes ?? {};
    for (const key of Object.keys(dynamicAttributes)) {
      current.attributes.add(key);
    }
    if (dynamicAttributes.configurable) {
      current.configurableCount += 1;
    }

    grouped.set(slug, current);
  }

  return Array.from(grouped.values())
    .map((item) => ({
      slug: item.slug,
      industry: item.industry,
      offeringCount: item.offerings.length,
      configurableCount: item.configurableCount,
      offerings: item.offerings.map((entry) => entry.offering),
      topAttributes: Array.from(item.attributes).filter((key) => key !== 'configurable').slice(0, 6),
    }))
    .sort((a, b) => a.industry.localeCompare(b.industry));
}

export function getIndustryDetailsBySlug(slug) {
  const matching = industryPayloads.filter((item) => safeSlug(item.industry) === slug);
  if (!matching.length) {
    return null;
  }

  const industry = matching[0].industry;
  const offeringCodes = new Set(matching.map((item) => item.offering));
  const relatedBundles = epcBundles.filter((bundle) =>
    (bundle.components || []).some((component) => offeringCodes.has(component)),
  );

  const relatedModules = modules.filter((module) => module.relatedIndustries.includes(industry));
  const recommendedTemplate = industryTemplates.find((template) => template.title.toLowerCase().includes(industry.toLowerCase()) || template.slug === safeSlug(industry));

  return {
    slug,
    industry,
    entries: matching,
    relatedBundles,
    relatedModules,
    recommendedTemplate,
  };
}

export function getModuleBySlug(slug) {
  return modules.find((module) => module.slug === slug) ?? null;
}

export function getCatalogTemplates() {
  return industryTemplates;
}

export function getCatalogTemplateBySlug(slug) {
  return industryTemplates.find((template) => template.slug === slug) ?? null;
}

export function getDemoCatalogs() {
  return demoCatalogs;
}

export function getDemoCatalogBySlug(slug) {
  return demoCatalogs.find((catalog) => catalog.slug === slug) ?? null;
}

export function getOverviewStats() {
  const industries = new Set(industryPayloads.map((item) => item.industry));
  return {
    moduleCount: modules.length,
    industryCount: industries.size,
    payloadCount: industryPayloads.length,
    bundleCount: epcBundles.length,
    demoCatalogCount: demoCatalogs.length,
  };
}

export function getTelecomDemoCatalog() {
  return getDemoCatalogBySlug('telecom-demo');
}

export { safeSlug };
