use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';

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
  };
}

export default function CatalogBuilderClient({ templates, initialSlug }) {
  const router = useRouter();
  const initialTemplate = templates.find((item) => item.slug === initialSlug) || templates[0];
  const [selectedSlug, setSelectedSlug] = useState(initialTemplate.slug);
  const [blueprint, setBlueprint] = useState(createInitialBlueprint(initialTemplate));
  const [saveError, setSaveError] = useState('');
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
  }

  function updateField(key, value) {
    setBlueprint((prev) => ({ ...prev, [key]: value }));
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

  function downloadBlueprint() {
    const payload = {
      catalog: {
        name: blueprint.catalogName,
        code: blueprint.catalogCode,
        industry: selectedSlug,
      },
      templateFocus: activeTemplate.focus,
      productSpecifications: blueprint.productSpecifications,
      serviceSpecifications: blueprint.serviceSpecifications,
      resourceSpecifications: blueprint.resourceSpecifications,
      characteristicDefinitions: blueprint.characteristics,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
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
        <Card title="2. Define catalog shell" description="Name the catalog and confirm the starter industry template.">
          <div className="form-grid">
            <Input label="Catalog name" value={blueprint.catalogName} onChange={(e) => updateField('catalogName', e.target.value)} />
            <Input label="Catalog code" value={blueprint.catalogCode} onChange={(e) => updateField('catalogCode', e.target.value)} />
          </div>
          <p className="helper-text">Selected template focus: {activeTemplate.focus}</p>
        </Card>

        <Card
          title="3. Product definitions"
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
          title="4. Characteristics"
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
          title="5. Persist or export"
          description="Persist the catalog into Supabase or export a portable JSON blueprint."
          actions={(
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Button onClick={saveCatalog} loading={saving}>Save to Supabase</Button>
              <Button variant="secondary" onClick={downloadBlueprint}>Download JSON</Button>
            </div>
          )}
        >
          {saveError ? <p className="ds-field__error">{saveError}</p> : null}
          <pre className="json-block builder-json">{JSON.stringify({
            catalog: { name: blueprint.catalogName, code: blueprint.catalogCode, industry: selectedSlug },
            productSpecifications: blueprint.productSpecifications,
            serviceSpecifications: blueprint.serviceSpecifications,
            resourceSpecifications: blueprint.resourceSpecifications,
            characteristicDefinitions: blueprint.characteristics,
          }, null, 2)}</pre>
        </Card>
      </section>
    </div>
  );
}
