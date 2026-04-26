'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';

function catalogCodeFragment(value, fallback = 'ITEM') {
  const normalized = String(value || fallback)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function inferTemplateSlug(catalog, payload, templates) {
  const raw = String(catalog?.industry || payload?.templateSlug || payload?.industry || '').trim().toLowerCase();
  if (!raw) return templates[0]?.slug;
  const normalized = raw.replace(/_/g, '-');
  return (
    templates.find((template) => template.slug === normalized)?.slug ||
    templates.find((template) => template.title.toLowerCase() === raw)?.slug ||
    templates.find((template) => template.title.toLowerCase().includes(raw))?.slug ||
    templates[0]?.slug
  );
}

function normalizeSpecItem(item, index, prefix, defaultCategory) {
  if (typeof item === 'string') {
    return {
      code: `${prefix}_${catalogCodeFragment(item, `ITEM_${index + 1}`)}`,
      name: item,
      category: defaultCategory,
      type: defaultCategory,
      lifecycle: 'Draft',
      businessModel: 'Configurable',
    };
  }

  return {
    ...item,
    code: item?.code || item?.id || `${prefix}_${index + 1}`,
    name: item?.name || item?.displayName || `${defaultCategory} ${index + 1}`,
    category: item?.category || defaultCategory,
    type: item?.type || defaultCategory,
  };
}

function normalizeCharacteristic(item, index, firstProductCode) {
  return {
    appliesTo: item?.appliesTo || item?.productSpecification?.id || firstProductCode || 'PS_PRIMARY',
    displayName: item?.displayName || item?.name || `Characteristic ${index + 1}`,
    name: item?.name || item?.displayName || `characteristic${index + 1}`,
    valueType: item?.valueType || item?.value_type || 'STRING',
    configurable: item?.configurable ?? true,
    configurableStage: item?.configurableStage || item?.stage || 'quotation',
    stage: item?.stage || item?.configurableStage || 'quotation,sale',
    presence: item?.presence || 'optional',
    minCardinality: item?.minCardinality ?? 0,
    maxCardinality: item?.maxCardinality ?? 1,
    interpretation: item?.interpretation || item?.description || '',
    ...item,
  };
}

function validateAndNormalizeBlueprintImport(payload, templates) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Blueprint JSON must be a JSON object.');
  }

  if (!payload.catalog || typeof payload.catalog !== 'object' || Array.isArray(payload.catalog)) {
    throw new Error('Blueprint JSON must contain a catalog object.');
  }

  const productSource = payload.productSpecifications ?? payload.starterProducts;
  const characteristicSource = payload.characteristicDefinitions ?? payload.characteristics;

  if (!Array.isArray(productSource) || productSource.length === 0) {
    throw new Error('Blueprint JSON must contain productSpecifications or starterProducts with at least one item.');
  }

  if (!Array.isArray(characteristicSource)) {
    throw new Error('Blueprint JSON must contain characteristicDefinitions or characteristics.');
  }

  const selectedSlug = inferTemplateSlug(payload.catalog, payload, templates);
  const template = templates.find((item) => item.slug === selectedSlug) || templates[0];
  const codeBase = catalogCodeFragment(payload.catalog.code || payload.catalog.name || template?.slug, 'CATALOG');

  const productSpecifications = productSource.map((item, index) => normalizeSpecItem(item, index, `PS_${codeBase}`, 'ProductSpecification'));
  const serviceSpecifications = ensureArray(payload.serviceSpecifications ?? payload.starterServices)
    .map((item, index) => normalizeSpecItem(item, index, `SS_${codeBase}`, 'ServiceSpecification'));
  const resourceSpecifications = ensureArray(payload.resourceSpecifications ?? payload.starterResources)
    .map((item, index) => normalizeSpecItem(item, index, `RS_${codeBase}`, 'ResourceSpecification'));
  const characteristics = characteristicSource.map((item, index) => normalizeCharacteristic(item, index, productSpecifications[0]?.code));

  return {
    selectedSlug,
    blueprint: {
      catalogName: payload.catalog.name || payload.catalog.title || `${template.title} Imported Catalog`,
      catalogCode: payload.catalog.code || `CAT-${codeBase}`,
      industry: selectedSlug,
      templateSlug: selectedSlug,
      catalog: payload.catalog,
      productSpecifications,
      productOfferings: ensureArray(payload.productOfferings),
      serviceSpecifications,
      resourceSpecifications,
      characteristics,
      hierarchy: ensureArray(payload.hierarchy),
      serviceMapping: ensureArray(payload.serviceMapping),
      tmf620Examples: payload.tmf620Examples,
      importSource: 'blueprint-json',
      metadata: {
        ...(payload.metadata || {}),
        importedAt: new Date().toISOString(),
        importSchema: payload.productSpecifications ? 'export-blueprint' : 'starter-blueprint',
      },
    },
  };
}

function createInitialBlueprint(template) {
  return {
    catalogName: `${template.title} Starter Catalog`,
    catalogCode: `CAT-${template.slug.toUpperCase().replace(/-/g, '_')}`,
    industry: template.slug,
    templateSlug: template.slug,
    productSpecifications: template.starterProducts.map((item, index) => ({
      code: `PS_${template.slug.toUpperCase().replace(/-/g, '_')}_${index + 1}`,
      name: item,
      category: 'ProductSpecification',
      type: 'ProductSpecification',
      lifecycle: 'Draft',
      businessModel: 'Configurable',
    })),
    productOfferings: [],
    serviceSpecifications: template.starterServices.map((item, index) => ({
      code: `SS_${template.slug.toUpperCase().replace(/-/g, '_')}_${index + 1}`,
      name: item,
      summary: `${item} service placeholder`,
    })),
    resourceSpecifications: template.starterResources.map((item, index) => ({
      code: `RS_${template.slug.toUpperCase().replace(/-/g, '_')}_${index + 1}`,
      name: item,
      summary: `${item} resource placeholder`,
    })),
    characteristics: [
      {
        appliesTo: `PS_${template.slug.toUpperCase().replace(/-/g, '_')}_1`,
        displayName: 'Display Name',
        name: 'displayName',
        valueType: 'STRING',
        configurable: true,
        configurableStage: 'quotation',
        stage: 'quotation,sale',
        presence: 'optional',
        minCardinality: 0,
        maxCardinality: 1,
        interpretation: 'Generic starter characteristic; rename and extend per industry.',
      },
    ],
    hierarchy: [],
    serviceMapping: [],
  };
}

export default function CatalogBuilderClient({ templates, initialSlug }) {
  const router = useRouter();
  const initialTemplate = templates.find((item) => item.slug === initialSlug) || templates[0];
  const [selectedSlug, setSelectedSlug] = useState(initialTemplate.slug);
  const [blueprint, setBlueprint] = useState(createInitialBlueprint(initialTemplate));
  const [saveError, setSaveError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeTemplate = useMemo(
    () => templates.find((item) => item.slug === selectedSlug) || templates[0],
    [selectedSlug, templates],
  );

  function switchTemplate(nextSlug) {
    const nextTemplate = templates.find((item) => item.slug === nextSlug);
    if (!nextTemplate) return;
    setSelectedSlug(nextSlug);
    setBlueprint(createInitialBlueprint(nextTemplate));
    setSaveError('');
    setImportMessage('');
  }

  function updateField(key, value) {
    setBlueprint((prev) => ({ ...prev, [key]: value }));
  }

  async function importBlueprintFile(file) {
    setSaveError('');
    setImportMessage('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      setSaveError('Only .json blueprint files are supported.');
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const normalized = validateAndNormalizeBlueprintImport(payload, templates);
      setSelectedSlug(normalized.selectedSlug);
      setBlueprint(normalized.blueprint);
      setImportMessage(`Imported ${file.name}; schema validated and mapped to ${normalized.selectedSlug}.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    }
  }

  function addCharacteristic() {
    setBlueprint((prev) => ({
      ...prev,
      characteristics: [
        ...prev.characteristics,
        {
          appliesTo: prev.productSpecifications[0]?.code || 'PS_PRIMARY',
          displayName: '',
          name: '',
          valueType: 'STRING',
          configurable: true,
          configurableStage: 'quotation',
          stage: 'quotation,sale',
          presence: 'optional',
          minCardinality: 0,
          maxCardinality: 1,
          interpretation: '',
        },
      ],
    }));
  }

  function updateCharacteristic(index, key, value) {
    setBlueprint((prev) => ({
      ...prev,
      characteristics: prev.characteristics.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function addProductSpecification() {
    setBlueprint((prev) => ({
      ...prev,
      productSpecifications: [
        ...prev.productSpecifications,
        { code: '', name: '', category: 'ProductSpecification', type: 'ProductSpecification', lifecycle: 'Draft', businessModel: 'Configurable' },
      ],
    }));
  }

  function updateProductSpecification(index, key, value) {
    setBlueprint((prev) => ({
      ...prev,
      productSpecifications: prev.productSpecifications.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function buildBlueprintExportPayload() {
    return {
      catalog: {
        name: blueprint.catalogName,
        code: blueprint.catalogCode,
        industry: selectedSlug,
      },
      templateFocus: activeTemplate.focus,
      productSpecifications: blueprint.productSpecifications,
      productOfferings: blueprint.productOfferings || [],
      serviceSpecifications: blueprint.serviceSpecifications,
      resourceSpecifications: blueprint.resourceSpecifications,
      characteristicDefinitions: blueprint.characteristics,
      hierarchy: blueprint.hierarchy || [],
      serviceMapping: blueprint.serviceMapping || [],
      tmf620Examples: blueprint.tmf620Examples,
      metadata: blueprint.metadata || {},
    };
  }

  function downloadBlueprint() {
    const blob = new Blob([JSON.stringify(buildBlueprintExportPayload(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${blueprint.catalogCode || 'catalog-blueprint'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function saveCatalog() {
    setSaving(true);
    setSaveError('');
    try {
      const response = await fetch('/api/catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...blueprint,
          templateSlug: activeTemplate.slug,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to persist the catalog blueprint.');
      }
      router.push(`/catalogs/${payload.item.slug}`);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="builder-layout">
      <section className="card builder-sidebar">
        <p className="eyebrow">1. Choose industry</p>
        <div className="template-list">
          {templates.map((template) => (
            <button
              className={`template-button${template.slug === selectedSlug ? ' active' : ''}`}
              key={template.slug}
              onClick={() => switchTemplate(template.slug)}
              type="button"
            >
              <strong>{template.title}</strong>
              <span>{template.focus}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="builder-main">
        <Card title="2. Import from Blueprint JSON" description="Drop a TMF620-style blueprint JSON exported from this app or a starter blueprint with catalog, starterProducts and characteristics.">
          <label
            className={`blueprint-dropzone${dragActive ? ' active' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void importBlueprintFile(event.dataTransfer.files?.[0]);
            }}
          >
            <input type="file" accept="application/json,.json" onChange={(event) => void importBlueprintFile(event.target.files?.[0])} />
            <span className="blueprint-dropzone-title">Import from Blueprint JSON</span>
            <span className="blueprint-dropzone-copy">Drag and drop a .json file here, or click to browse. The importer validates catalog, product and characteristic sections before replacing the editor state.</span>
          </label>
          {importMessage ? <p className="success-text">{importMessage}</p> : null}
        </Card>

        <Card title="3. Define catalog shell" description="Name the catalog and confirm the starter industry template.">
          <div className="form-grid">
            <Input label="Catalog name" value={blueprint.catalogName} onChange={(e) => updateField('catalogName', e.target.value)} />
            <Input label="Catalog code" value={blueprint.catalogCode} onChange={(e) => updateField('catalogCode', e.target.value)} />
          </div>
          <p className="helper-text">Selected template focus: {activeTemplate.focus}</p>
        </Card>

        <Card
          title="4. Product definitions"
          description="Create the base product specifications that will become ProductSpecifications inside the TMF620-aligned catalog."
          actions={<Button variant="secondary" size="sm" onClick={addProductSpecification}>Add product specification</Button>}
        >
          <div className="editable-grid">
            {blueprint.productSpecifications.map((item, index) => (
              <div className="editable-row" key={`${item.code}-${index}`}>
                <input placeholder="Code" value={item.code} onChange={(e) => updateProductSpecification(index, 'code', e.target.value)} />
                <input placeholder="Name" value={item.name} onChange={(e) => updateProductSpecification(index, 'name', e.target.value)} />
                <input placeholder="Category" value={item.category} onChange={(e) => updateProductSpecification(index, 'category', e.target.value)} />
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="5. Characteristics"
          description="Define universal characteristic metadata that can later be refined for any industry."
          actions={<Button variant="secondary" size="sm" onClick={addCharacteristic}>Add characteristic</Button>}
        >
          <div className="characteristic-editor">
            {blueprint.characteristics.map((item, index) => (
              <div className="characteristic-card" key={`${item.name}-${index}`}>
                <div className="editable-grid triple-grid">
                  <input placeholder="Applies to" value={item.appliesTo} onChange={(e) => updateCharacteristic(index, 'appliesTo', e.target.value)} />
                  <input placeholder="Display name" value={item.displayName || ''} onChange={(e) => updateCharacteristic(index, 'displayName', e.target.value)} />
                  <input placeholder="Name" value={item.name} onChange={(e) => updateCharacteristic(index, 'name', e.target.value)} />
                  <select value={item.valueType} onChange={(e) => updateCharacteristic(index, 'valueType', e.target.value)}>
                    <option>STRING</option>
                    <option>NUMBER</option>
                    <option>BOOLEAN</option>
                    <option>ENUM</option>
                    <option>JSON</option>
                  </select>
                  <select value={String(item.configurable)} onChange={(e) => updateCharacteristic(index, 'configurable', e.target.value === 'true')}>
                    <option value="true">Configurable</option>
                    <option value="false">Non-configurable</option>
                  </select>
                  <input placeholder="Stage" value={item.stage} onChange={(e) => updateCharacteristic(index, 'stage', e.target.value)} />
                  <input placeholder="Interpretation" value={item.interpretation} onChange={(e) => updateCharacteristic(index, 'interpretation', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="6. Persist or export"
          description="Persist the catalog into Supabase or export a portable JSON blueprint. Slug conflicts are resolved automatically on save."
          actions={(
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Button onClick={saveCatalog} loading={saving}>Save to Supabase</Button>
              <Button variant="secondary" onClick={downloadBlueprint}>Download JSON</Button>
            </div>
          )}
        >
          {saveError ? <p className="ds-field__error">{saveError}</p> : null}
          <pre className="json-block builder-json">{JSON.stringify(buildBlueprintExportPayload(), null, 2)}</pre>
        </Card>
      </section>
    </div>
  );
}
