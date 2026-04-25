'use client';

import { useMemo, useState } from 'react';

function createInitialBlueprint(template) {
  return {
    catalogName: `${template.title} Starter Catalog`,
    catalogCode: `CAT-${template.slug.toUpperCase().replace(/-/g, '_')}`,
    industry: template.slug,
    productSpecifications: template.starterProducts.map((item, index) => ({
      code: `PS_${template.slug.toUpperCase().replace(/-/g, '_')}_${index + 1}`,
      name: item,
      category: 'ProductSpecification',
    })),
    serviceSpecifications: template.starterServices.map((item, index) => ({
      code: `SS_${template.slug.toUpperCase().replace(/-/g, '_')}_${index + 1}`,
      name: item,
    })),
    resourceSpecifications: template.starterResources.map((item, index) => ({
      code: `RS_${template.slug.toUpperCase().replace(/-/g, '_')}_${index + 1}`,
      name: item,
    })),
    characteristics: [
      {
        appliesTo: template.starterProducts[0] || 'Primary Product',
        name: 'displayName',
        valueType: 'STRING',
        configurable: true,
        stage: 'quotation,sale',
        interpretation: 'Generic starter characteristic; rename and extend per industry.',
      },
    ],
  };
}

export default function CatalogBuilderClient({ templates, initialSlug }) {
  const initialTemplate = templates.find((item) => item.slug === initialSlug) || templates[0];
  const [selectedSlug, setSelectedSlug] = useState(initialTemplate.slug);
  const [blueprint, setBlueprint] = useState(createInitialBlueprint(initialTemplate));

  const activeTemplate = useMemo(
    () => templates.find((item) => item.slug === selectedSlug) || templates[0],
    [selectedSlug, templates],
  );

  function switchTemplate(nextSlug) {
    const nextTemplate = templates.find((item) => item.slug === nextSlug);
    if (!nextTemplate) return;
    setSelectedSlug(nextSlug);
    setBlueprint(createInitialBlueprint(nextTemplate));
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
          appliesTo: prev.productSpecifications[0]?.name || 'Primary Product',
          name: '',
          valueType: 'STRING',
          configurable: true,
          stage: 'quotation,sale',
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
        { code: '', name: '', category: 'ProductSpecification' },
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
        <section className="card form-card">
          <p className="eyebrow">2. Define catalog shell</p>
          <div className="form-grid">
            <label>
              <span>Catalog name</span>
              <input value={blueprint.catalogName} onChange={(e) => updateField('catalogName', e.target.value)} />
            </label>
            <label>
              <span>Catalog code</span>
              <input value={blueprint.catalogCode} onChange={(e) => updateField('catalogCode', e.target.value)} />
            </label>
          </div>
          <p className="helper-text">Selected template focus: {activeTemplate.focus}</p>
        </section>

        <section className="card form-card">
          <div className="section-heading-row compact-row">
            <div>
              <p className="eyebrow">3. Product definitions</p>
              <h2>Starter product specifications</h2>
            </div>
            <button type="button" className="secondary-button compact-button" onClick={addProductSpecification}>Add product specification</button>
          </div>
          <div className="editable-grid">
            {blueprint.productSpecifications.map((item, index) => (
              <div className="editable-row" key={`${item.code}-${index}`}>
                <input placeholder="Code" value={item.code} onChange={(e) => updateProductSpecification(index, 'code', e.target.value)} />
                <input placeholder="Name" value={item.name} onChange={(e) => updateProductSpecification(index, 'name', e.target.value)} />
                <input placeholder="Category" value={item.category} onChange={(e) => updateProductSpecification(index, 'category', e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        <section className="card form-card">
          <div className="section-heading-row compact-row">
            <div>
              <p className="eyebrow">4. Characteristics</p>
              <h2>Universal characteristic definitions</h2>
            </div>
            <button type="button" className="secondary-button compact-button" onClick={addCharacteristic}>Add characteristic</button>
          </div>
          <div className="characteristic-editor">
            {blueprint.characteristics.map((item, index) => (
              <div className="characteristic-card" key={`${item.name}-${index}`}>
                <div className="editable-grid triple-grid">
                  <input placeholder="Applies to" value={item.appliesTo} onChange={(e) => updateCharacteristic(index, 'appliesTo', e.target.value)} />
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
        </section>

        <section className="card form-card">
          <div className="section-heading-row compact-row">
            <div>
              <p className="eyebrow">5. Export</p>
              <h2>Blueprint preview</h2>
            </div>
            <button type="button" className="primary-button compact-button" onClick={downloadBlueprint}>Download JSON</button>
          </div>
          <pre className="json-block builder-json">{JSON.stringify({
            catalog: {
              name: blueprint.catalogName,
              code: blueprint.catalogCode,
              industry: activeTemplate.title,
            },
            starterProducts: blueprint.productSpecifications,
            starterServices: blueprint.serviceSpecifications,
            starterResources: blueprint.resourceSpecifications,
            characteristicDefinitions: blueprint.characteristics,
          }, null, 2)}</pre>
        </section>
      </section>
    </div>
  );
}
