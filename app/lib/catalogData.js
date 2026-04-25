import { promises as fs } from 'node:fs';
import path from 'node:path';

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
      'TMF/EPC-ready headless modeling baseline',
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

function safeSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readJson(relativePath) {
  const filePath = path.join(process.cwd(), relativePath);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export async function getIndustryPayloads() {
  return readJson('data/industryPayloads.json');
}

export async function getEpcBundles() {
  return readJson('data/epcBundles.json');
}

export async function getIndustrySummaries() {
  const payloads = await getIndustryPayloads();
  const grouped = new Map();

  for (const payload of payloads) {
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

export async function getIndustryDetailsBySlug(slug) {
  const payloads = await getIndustryPayloads();
  const bundles = await getEpcBundles();
  const matching = payloads.filter((item) => safeSlug(item.industry) === slug);
  if (!matching.length) {
    return null;
  }

  const industry = matching[0].industry;
  const offeringCodes = new Set(matching.map((item) => item.offering));
  const relatedBundles = bundles.filter((bundle) =>
    (bundle.components || []).some((component) => offeringCodes.has(component)),
  );

  const relatedModules = modules.filter((module) => module.relatedIndustries.includes(industry));

  return {
    slug,
    industry,
    entries: matching,
    relatedBundles,
    relatedModules,
  };
}

export function getModuleBySlug(slug) {
  return modules.find((module) => module.slug === slug) ?? null;
}

export async function getOverviewStats() {
  const [payloads, bundles] = await Promise.all([getIndustryPayloads(), getEpcBundles()]);
  const industries = new Set(payloads.map((item) => item.industry));
  return {
    moduleCount: modules.length,
    industryCount: industries.size,
    payloadCount: payloads.length,
    bundleCount: bundles.length,
  };
}
