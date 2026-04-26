import { randomUUID } from 'node:crypto';
import {
  getConfiguredSupabaseUrl,
  getSupabaseTableName,
  hasSupabaseWriteAccess,
  supabaseRest,
} from './supabaseRest.js';
import {
  getCatalogTemplateBySlug,
  getDemoCatalogBySlug,
  getDemoCatalogs,
  safeSlug,
} from './catalogData.js';

const TABLE_NAME = getSupabaseTableName();
const MAX_SLUG_ATTEMPTS = 12;

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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function shortToken() {
  return randomUUID().replace(/-/g, '').slice(0, 8);
}

function makeCloneCode(oldCode, cloneToken) {
  const normalized = String(oldCode || 'NODE').trim().replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return `${normalized || 'NODE'}_CLONE_${cloneToken.toUpperCase()}`;
}

function replaceExactReferences(value, idMap) {
  if (Array.isArray(value)) {
    return value.map((item) => replaceExactReferences(item, idMap));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceExactReferences(item, idMap)]),
    );
  }

  if (typeof value === 'string' && idMap.has(value)) {
    return idMap.get(value);
  }

  return value;
}

function collectCodes(items, idMap, cloneToken) {
  ensureArray(items).forEach((item) => {
    if (item?.code && !idMap.has(item.code)) {
      idMap.set(item.code, makeCloneCode(item.code, cloneToken));
    }
    if (item?.id && !idMap.has(item.id)) {
      idMap.set(item.id, makeCloneCode(item.id, cloneToken));
    }
  });
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
  const characteristicDefinitions = ensureArray(blueprint.characteristics || blueprint.characteristicDefinitions);
  const primarySpec =
    productSpecifications[0] ||
    { code: `${catalogCode}_SPEC`, name: `${catalogTitle} Root Product`, category: 'ProductSpecification' };

  const productOfferings = ensureArray(blueprint.productOfferings).length
    ? ensureArray(blueprint.productOfferings)
    : [
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

  const hierarchy = ensureArray(blueprint.hierarchy).length
    ? ensureArray(blueprint.hierarchy)
    : productSpecifications.slice(1).map((item) => ({
      parent: primarySpec.code,
      child: item.code,
      min: 0,
      max: 1,
      defaultQty: 0,
      lane: 'bundle',
    }));

  const serviceMapping = ensureArray(blueprint.serviceMapping).length
    ? ensureArray(blueprint.serviceMapping)
    : serviceSpecifications.map((service, index) => ({
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
      ...(blueprint.catalog || {}),
      code: catalogCode,
      version: blueprint.catalog?.version || '1.0.0',
      validFor: blueprint.catalog?.validFor || 'open-ended',
      businessDomains: blueprint.catalog?.businessDomains || [template.title],
    },
    productSpecifications,
    productOfferings,
    serviceSpecifications,
    resourceSpecifications,
    characteristicDefinitions,
    hierarchy,
    serviceMapping,
    tmf620Examples: blueprint.tmf620Examples || buildDefaultTmFExamples(
      primarySpec.code,
      primarySpec.name,
      productOfferings[0]?.code,
      productOfferings[0]?.name,
    ),
    metadata: {
      templateSlug: template.slug,
      templateFocus: template.focus,
      importSource: blueprint.importSource,
      ...(blueprint.metadata || {}),
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

async function ensureUniqueCatalogSlug(baseSlug) {
  const normalizedBase = safeSlug(baseSlug || `catalog-${shortToken()}`) || `catalog-${shortToken()}`;

  if (!hasSupabaseWriteAccess()) return normalizedBase;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 0 ? normalizedBase : `${normalizedBase}-${shortToken()}`;
    const existing = await getPersistedCatalogBySlug(candidate);
    if (!existing) return candidate;
  }

  return `${normalizedBase}-${Date.now().toString(36)}-${shortToken()}`;
}

export async function createPersistedCatalog(record) {
  const rowPayload = catalogToRow({
    ...record,
    slug: await ensureUniqueCatalogSlug(record.slug || record.catalog?.code || record.title),
  });

  const rows = await supabaseRest(`${TABLE_NAME}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(rowPayload),
  });
  return rowToCatalog(rows[0]);
}

export function createDeepClonedCatalogRecord(sourceCatalog) {
  if (!sourceCatalog) {
    throw new Error('Source catalog is required for deep clone.');
  }

  const cloneToken = shortToken();
  const clone = deepClone(sourceCatalog);
  const idMap = new Map();

  collectCodes(clone.productSpecifications, idMap, cloneToken);
  collectCodes(clone.productOfferings, idMap, cloneToken);
  collectCodes(clone.serviceSpecifications, idMap, cloneToken);
  collectCodes(clone.resourceSpecifications, idMap, cloneToken);

  const originalCatalogCode = clone.catalog?.code;
  if (originalCatalogCode) {
    idMap.set(originalCatalogCode, makeCloneCode(originalCatalogCode, cloneToken));
  }

  const remapped = replaceExactReferences(clone, idMap);
  const baseTitle = String(sourceCatalog.title || 'Catalog').replace(/\s+\(Clone [^)]+\)$/i, '');
  const newCatalogCode = originalCatalogCode
    ? idMap.get(originalCatalogCode)
    : `CAT_CLONE_${cloneToken.toUpperCase()}`;

  return {
    ...remapped,
    slug: `${safeSlug(sourceCatalog.slug || sourceCatalog.title || 'catalog')}-clone-${cloneToken}`,
    title: `${baseTitle} (Clone ${cloneToken})`,
    sourceKind: 'clone',
    catalog: {
      ...(remapped.catalog || {}),
      id: randomUUID(),
      code: newCatalogCode,
      version: remapped.catalog?.version || '1.0.0',
    },
    metadata: {
      ...(remapped.metadata || {}),
      clonedFromSlug: sourceCatalog.slug,
      cloneToken,
      idMap: Object.fromEntries(idMap),
      deepCloneVersion: '2026-04-26',
    },
  };
}

export async function cloneCatalogAsNew(sourceSlug) {
  const source = await resolveCatalogBySlug(sourceSlug);
  if (!source) {
    throw new Error(`Catalog ${sourceSlug} was not found.`);
  }
  return createPersistedCatalog(createDeepClonedCatalogRecord(source));
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

export async function updatePersistedHierarchy(slug, hierarchy, serviceMapping, visualState = null) {
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

  if (visualState && typeof visualState === 'object') {
    payload.metadata = {
      ...(existing.metadata || {}),
      hierarchyStudio: {
        rootNodeCodes: ensureArray(visualState.rootNodeCodes),
        removedNodeCodes: ensureArray(visualState.removedNodeCodes),
        customPositions: visualState.customPositions && typeof visualState.customPositions === 'object'
          ? visualState.customPositions
          : {},
        laneLayout: visualState.laneLayout && typeof visualState.laneLayout === 'object'
          ? visualState.laneLayout
          : undefined,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const rows = await supabaseRest(`${TABLE_NAME}?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return rowToCatalog(rows[0]);
}

export async function updatePersistedEntities(slug, payload = {}) {
  const existing = (await ensurePersistedSeedForSlug(slug)) || (await getPersistedCatalogBySlug(slug));
  if (!existing) {
    throw new Error(`Catalog ${slug} was not found.`);
  }

  const patch = {};
  if (payload.productSpecifications !== undefined) {
    patch.product_specifications = ensureArray(payload.productSpecifications);
  }
  if (payload.serviceSpecifications !== undefined) {
    patch.service_specifications = ensureArray(payload.serviceSpecifications);
  }
  if (payload.resourceSpecifications !== undefined) {
    patch.resource_specifications = ensureArray(payload.resourceSpecifications);
  }
  if (payload.productOfferings !== undefined) {
    patch.product_offerings = ensureArray(payload.productOfferings);
  }
  if (payload.catalogCategories !== undefined || payload.offeringCategories !== undefined) {
    patch.metadata = {
      ...(existing.metadata || {}),
      catalogGrouping: {
        catalogCategories: ensureArray(payload.catalogCategories),
        offeringCategories: ensureArray(payload.offeringCategories),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const rows = await supabaseRest(`${TABLE_NAME}?slug=eq.${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
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
