import {
  getConfiguredSupabaseUrl,
  getSupabaseTableName,
  hasSupabaseWriteAccess,
  supabaseRest,
} from './supabaseRest';
import {
  getCatalogTemplateBySlug,
  getDemoCatalogBySlug,
  getDemoCatalogs,
  safeSlug,
} from './catalogData';

const TABLE_NAME = getSupabaseTableName();

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildDescriptionFromTemplate(template) {
  return `${template.title} starter catalog generated from the universal EPC/TMF620 template layer.`;
}

function normalizeText(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function buildDefaultTmFExamples(primarySpecCode, primarySpecName, offeringCode, offeringName) {
  return {
    productSpecification: {
      '@type': 'ProductSpecification',
      id: primarySpecCode,
      name: primarySpecName,
      lifecycleStatus: 'Draft',
      version: '1.0',
      isBundle: true,
    },
    productOffering: {
      '@type': 'ProductOffering',
      id: offeringCode,
      name: offeringName,
      lifecycleStatus: 'Draft',
      productSpecification: {
        id: primarySpecCode,
        name: primarySpecName,
      },
    },
  };
}

export function createCatalogRecordFromBlueprint(blueprint, template) {
  const catalogTitle = normalizeText(blueprint.catalogName, `${template.title} Starter Catalog`);
  const catalogCode = normalizeText(
    blueprint.catalogCode,
    `CAT-${template.slug.toUpperCase().replace(/-/g, '_')}`,
  );
  const productSpecifications = ensureArray(blueprint.productSpecifications);
  const serviceSpecifications = ensureArray(blueprint.serviceSpecifications);
  const resourceSpecifications = ensureArray(blueprint.resourceSpecifications);
  const characteristicDefinitions = ensureArray(blueprint.characteristics);
  const primarySpec =
    productSpecifications[0] ||
    { code: `${catalogCode}_SPEC`, name: `${catalogTitle} Root Product`, category: 'ProductSpecification' };

  const productOfferings = [
    {
      code: `PO_${catalogCode.replace(/[^A-Z0-9_]/gi, '_')}`,
      name: `${catalogTitle} Default Offering`,
      specificationCode: primarySpec.code,
      status: 'Draft',
      validFor: 'open-ended',
      channels: ['Web'],
      priceSummary: 'Define pricing',
      summary: 'Starter offering created from the catalog builder.',
    },
  ];

  const hierarchy = productSpecifications.slice(1).map((item) => ({
    parent: primarySpec.code,
    child: item.code,
    min: 0,
    max: 1,
    defaultQty: 0,
    lane: 'bundle',
  }));

  const serviceMapping = serviceSpecifications.map((service, index) => ({
    productSpec: primarySpec.code,
    serviceSpec: service.code,
    resourceSpecs: resourceSpecifications.slice(index, index + 1).map((item) => item.code),
  }));

  return {
    slug: safeSlug(catalogCode || catalogTitle),
    title: catalogTitle,
    industry: template.title,
    tmfVersion: 'TMF620 v4/v5 aligned logical structure',
    description: buildDescriptionFromTemplate(template),
    sourceKind: 'custom',
    catalog: {
      code: catalogCode,
      version: '1.0.0',
      validFor: 'open-ended',
      businessDomains: [template.title],
    },
    productSpecifications,
    productOfferings,
    serviceSpecifications,
    resourceSpecifications,
    characteristicDefinitions,
    hierarchy,
    serviceMapping,
    tmf620Examples: buildDefaultTmFExamples(
      primarySpec.code,
      primarySpec.name,
      productOfferings[0].code,
      productOfferings[0].name,
    ),
    metadata: {
      templateSlug: template.slug,
      templateFocus: template.focus,
    },
  };
}

function rowToCatalog(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    industry: row.industry,
    tmfVersion: row.tmf_version,
    description: row.description,
    sourceKind: row.source_kind || 'custom',
    catalog: row.catalog || {},
    productSpecifications: ensureArray(row.product_specifications),
    productOfferings: ensureArray(row.product_offerings),
    serviceSpecifications: ensureArray(row.service_specifications),
    resourceSpecifications: ensureArray(row.resource_specifications),
    characteristicDefinitions: ensureArray(row.characteristic_definitions),
    hierarchy: ensureArray(row.hierarchy),
    serviceMapping: ensureArray(row.service_mapping),
    tmf620Examples: row.tmf620_examples || {
      productSpecification: {},
      productOffering: {},
    },
    metadata: row.metadata || {},
    updatedAt: row.updated_at,
  };
}

function catalogToRow(catalog) {
  return {
    slug: catalog.slug,
    title: catalog.title,
    industry: catalog.industry,
    description: catalog.description,
    tmf_version: catalog.tmfVersion,
    source_kind: catalog.sourceKind || 'custom',
    catalog: catalog.catalog || {},
    product_specifications: ensureArray(catalog.productSpecifications),
    product_offerings: ensureArray(catalog.productOfferings),
    service_specifications: ensureArray(catalog.serviceSpecifications),
    resource_specifications: ensureArray(catalog.resourceSpecifications),
    characteristic_definitions: ensureArray(catalog.characteristicDefinitions),
    hierarchy: ensureArray(catalog.hierarchy),
    service_mapping: ensureArray(catalog.serviceMapping),
    tmf620_examples: catalog.tmf620Examples || {},
    metadata: catalog.metadata || {},
  };
}

export function getPersistenceDiagnostics() {
  return {
    supabaseUrl: getConfiguredSupabaseUrl(),
    persistenceEnabled: hasSupabaseWriteAccess(),
    tableName: TABLE_NAME,
  };
}

export async function listPersistedCatalogs() {
  if (!hasSupabaseWriteAccess()) {
    return [];
  }

  const rows = await supabaseRest(
    `${TABLE_NAME}?select=slug,title,industry,description,source_kind,updated_at,product_specifications,product_offerings,characteristic_definitions&order=updated_at.desc`,
    { method: 'GET' },
  );

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    industry: row.industry,
    description: row.description,
    sourceKind: row.source_kind || 'custom',
    updatedAt: row.updated_at,
    productSpecifications: ensureArray(row.product_specifications),
    productOfferings: ensureArray(row.product_offerings),
    characteristicDefinitions: ensureArray(row.characteristic_definitions),
  }));
}

export async function getPersistedCatalogBySlug(slug) {
  if (!hasSupabaseWriteAccess()) {
    return null;
  }

  const rows = await supabaseRest(
    `${TABLE_NAME}?slug=eq.${encodeURIComponent(slug)}&select=*`,
    { method: 'GET' },
  );

  return rowToCatalog(rows[0] || null);
}

export async function createPersistedCatalog(record) {
  const rows = await supabaseRest(`${TABLE_NAME}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(catalogToRow(record)),
  });
  return rowToCatalog(rows[0]);
}

export async function ensurePersistedSeedForSlug(slug) {
  const existing = await getPersistedCatalogBySlug(slug);
  if (existing) return existing;

  const demo = getDemoCatalogBySlug(slug);
  if (!demo) return null;

  return createPersistedCatalog({
    ...demo,
    sourceKind: 'seeded-demo',
    metadata: { seededFrom: 'demo-catalog' },
  });
}

export async function updatePersistedCharacteristics(slug, characteristicDefinitions) {
  const existing = (await ensurePersistedSeedForSlug(slug)) || (await getPersistedCatalogBySlug(slug));
  if (!existing) {
    throw new Error(`Catalog ${slug} was not found.`);
  }

  const rows = await supabaseRest(`${TABLE_NAME}?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      characteristic_definitions: ensureArray(characteristicDefinitions),
    }),
  });

  return rowToCatalog(rows[0]);
}

export async function updatePersistedHierarchy(slug, hierarchy, serviceMapping) {
  const existing = (await ensurePersistedSeedForSlug(slug)) || (await getPersistedCatalogBySlug(slug));
  if (!existing) {
    throw new Error(`Catalog ${slug} was not found.`);
  }

  const payload = {
    hierarchy: ensureArray(hierarchy),
  };

  if (serviceMapping !== undefined) {
    payload.service_mapping = ensureArray(serviceMapping);
  }

  const rows = await supabaseRest(`${TABLE_NAME}?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return rowToCatalog(rows[0]);
}

export async function resolveCatalogBySlug(slug) {
  const persisted = await getPersistedCatalogBySlug(slug);
  if (persisted) return persisted;
  return getDemoCatalogBySlug(slug);
}

export async function resolveCatalogsForIndex() {
  const demoCatalogs = getDemoCatalogs();
  const persisted = await listPersistedCatalogs();
  return {
    persisted,
    demoCatalogs,
  };
}

export function createBlueprintRecord(payload) {
  const template = getCatalogTemplateBySlug(payload.templateSlug || payload.industry) || getCatalogTemplateBySlug('telecommunications');
  if (!template) {
    throw new Error('No matching industry template found for the submitted catalog blueprint.');
  }
  return createCatalogRecordFromBlueprint(payload, template);
}
