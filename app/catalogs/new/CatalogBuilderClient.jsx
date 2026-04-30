'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';
import {
  EPC_CHANNELS,
  EPC_CHARGE_TYPES,
  EPC_CONFIG_STAGES,
  EPC_LIFECYCLE_STATUSES,
  EPC_PRESENCE_TYPES,
  EPC_PRICE_METHODS,
  EPC_PRODUCT_STATUSES,
  EPC_VALUE_TYPES,
  DEFAULT_CHARACTERISTIC_DEFINITION,
  createProductInventoryDraft,
  createProductOfferingDraft,
  createProductSpecificationDraft,
  epcCodeFragment,
} from '../../lib/epcEntityDefinitions';

function catalogCodeFragment(value, fallback = 'ITEM') {
  return epcCodeFragment(value, fallback);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function csvToArray(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
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
      ...createProductSpecificationDraft(index, prefix),
      code: `${prefix}_${catalogCodeFragment(item, `ITEM_${index + 1}`)}`,
      name: item,
      caption: item,
      category: defaultCategory,
      type: defaultCategory,
    };
  }

  return {
    ...createProductSpecificationDraft(index, prefix),
    ...item,
    code: item?.code || item?.id || `${prefix}_${index + 1}`,
    name: item?.name || item?.displayName || item?.caption || `${defaultCategory} ${index + 1}`,
    caption: item?.caption || item?.name || item?.displayName || `${defaultCategory} ${index + 1}`,
    category: item?.category || defaultCategory,
    type: item?.type || defaultCategory,
    lifecycle: item?.lifecycle || item?.lifecycleStatus || 'Draft',
    lifecycleStatus: item?.lifecycleStatus || item?.lifecycle || 'Draft',
    isBundle: Boolean(item?.isBundle),
    version: item?.version || '1',
  };
}

function normalizeOfferingItem(item, index, firstProductCode, prefix) {
  const channelNames = item?.channel?.map?.((channel) => channel.caption || channel.name).filter(Boolean) || [];
  const marketSegmentNames = item?.marketSegment?.map?.((segment) => segment.caption || segment.name).filter(Boolean) || [];
  const firstPrice = item?.productOfferingPrice?.[0];
  return {
    ...createProductOfferingDraft(index, firstProductCode, prefix),
    ...item,
    code: item?.code || item?.id || `${prefix}_OFFERING_${index + 1}`,
    name: item?.name || item?.caption || `Product Offering ${index + 1}`,
    caption: item?.caption || item?.name || `Product Offering ${index + 1}`,
    description: item?.description || '',
    specificationCode: item?.specificationCode || item?.productSpecificationCode || item?.productSpecification?.id || firstProductCode || '',
    lifecycleStatus: item?.lifecycleStatus || item?.status || 'Draft',
    status: item?.status || item?.lifecycleStatus || 'Draft',
    version: item?.version || '1',
    isBundle: Boolean(item?.isBundle),
    isSellable: item?.isSellable ?? true,
    saleType: item?.saleType || 'new-sale',
    activationMode: item?.activationMode || 'automatic',
    requiresServiceAgreement: Boolean(item?.requiresServiceAgreement),
    requiresFrameAgreement: Boolean(item?.requiresFrameAgreement),
    channels: ensureArray(item?.channels).length ? item.channels : (channelNames.length ? channelNames : ['Web']),
    marketSegments: ensureArray(item?.marketSegments).length ? item.marketSegments : marketSegmentNames,
    category: typeof item?.category === 'string' ? item.category : item?.category?.[0]?.caption || item?.category?.[0]?.name || 'Offering',
    validForStart: item?.validForStart || item?.validFor?.startDateTime || '',
    validForEnd: item?.validForEnd || item?.validFor?.endDateTime || '',
    validFor: item?.validForLabel || (typeof item?.validFor === 'string' ? item.validFor : 'open-ended'),
    priceSummary: item?.priceSummary || firstPrice?.name || 'Define pricing',
    price: item?.price || {
      name: firstPrice?.name || 'Base charge',
      chargeType: firstPrice?.priceType || 'RECURRING',
      calculationMethod: 'FLAT_FEE',
      amount: firstPrice?.price?.taxIncludedAmount?.value || 0,
      currency: firstPrice?.price?.taxIncludedAmount?.unit || 'HUF',
      recurrence: firstPrice?.recurringChargePeriod || 'monthly',
      formula: '',
    },
    terms: ensureArray(item?.terms || item?.productOfferingTerm),
  };
}

function normalizeProductInventoryItem(item, index, firstOfferingCode, firstProductCode, prefix) {
  return {
    ...createProductInventoryDraft(index, firstOfferingCode, firstProductCode, prefix),
    ...item,
    code: item?.code || item?.id || `${prefix}_PRODUCT_${index + 1}`,
    id: item?.id || item?.code || `${prefix}_PRODUCT_${index + 1}`,
    name: item?.name || item?.caption || `Product Instance ${index + 1}`,
    productOfferingCode: item?.productOfferingCode || item?.productOffering?.id || firstOfferingCode || '',
    productSpecificationCode: item?.productSpecificationCode || item?.productSpecification?.id || firstProductCode || '',
    status: item?.status || item?.lifecycleStatus || 'Created',
    lifecycleStatus: item?.lifecycleStatus || item?.status || 'Created',
    productType: item?.productType || item?.type || 'SERVICE',
    productSerialNumber: item?.productSerialNumber || item?.serialNumber || '',
    serviceId: item?.serviceId || item?.service?.id || '',
    msisdn: item?.msisdn || item?.publicIdentifier || '',
    startDate: item?.startDate || item?.startDateTime || item?.validFor?.startDateTime || '',
    terminationDate: item?.terminationDate || item?.validFor?.endDateTime || '',
    place: item?.place || item?.location || '',
    relatedParty: item?.relatedParty || '',
    billingAccount: item?.billingAccount || item?.billingAccountId || '',
    characteristicValues: item?.characteristicValues || item?.productCharacteristic || {},
  };
}

function normalizeCharacteristic(item, index, firstProductCode) {
  return {
    ...DEFAULT_CHARACTERISTIC_DEFINITION,
    ...item,
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
  };
}

function validateAndNormalizeBlueprintImport(payload, templates) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Blueprint JSON must be a JSON object.');
  if (!payload.catalog || typeof payload.catalog !== 'object' || Array.isArray(payload.catalog)) throw new Error('Blueprint JSON must contain a catalog object.');

  const productSource = payload.productSpecifications ?? payload.starterProducts;
  const offeringSource = payload.productOfferings ?? [];
  const inventorySource = payload.productInventory ?? payload.products ?? [];
  const characteristicSource = payload.characteristicDefinitions ?? payload.characteristics;

  if (!Array.isArray(productSource) || productSource.length === 0) throw new Error('Blueprint JSON must contain productSpecifications or starterProducts with at least one item.');
  if (!Array.isArray(characteristicSource)) throw new Error('Blueprint JSON must contain characteristicDefinitions or characteristics.');

  const selectedSlug = inferTemplateSlug(payload.catalog, payload, templates);
  const template = templates.find((item) => item.slug === selectedSlug) || templates[0];
  const codeBase = catalogCodeFragment(payload.catalog.code || payload.catalog.name || template?.slug, 'CATALOG');

  const productSpecifications = productSource.map((item, index) => normalizeSpecItem(item, index, `PS_${codeBase}`, 'ProductSpecification'));
  const productOfferings = ensureArray(offeringSource).map((item, index) => normalizeOfferingItem(item, index, productSpecifications[0]?.code, `PO_${codeBase}`));
  const productInventory = ensureArray(inventorySource).map((item, index) => normalizeProductInventoryItem(item, index, productOfferings[0]?.code, productSpecifications[0]?.code, `PR_${codeBase}`));
  const serviceSpecifications = ensureArray(payload.serviceSpecifications ?? payload.starterServices).map((item, index) => normalizeSpecItem(item, index, `SS_${codeBase}`, 'ServiceSpecification'));
  const resourceSpecifications = ensureArray(payload.resourceSpecifications ?? payload.starterResources).map((item, index) => normalizeSpecItem(item, index, `RS_${codeBase}`, 'ResourceSpecification'));
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
      productOfferings,
      productInventory,
      serviceSpecifications,
      resourceSpecifications,
      characteristics,
      hierarchy: ensureArray(payload.hierarchy),
      serviceMapping: ensureArray(payload.serviceMapping),
      tmf620Examples: payload.tmf620Examples,
      importSource: 'blueprint-json',
      metadata: { ...(payload.metadata || {}), importedAt: new Date().toISOString(), importSchema: 'epc-entity-blueprint' },
    },
  };
}

function createInitialBlueprint(template) {
  const specCode = `PS_${template.slug.toUpperCase().replace(/-/g, '_')}_1`;
  const offeringCode = `PO_${template.slug.toUpperCase().replace(/-/g, '_')}_1`;
  return {
    catalogName: `${template.title} Starter Catalog`,
    catalogCode: `CAT-${template.slug.toUpperCase().replace(/-/g, '_')}`,
    industry: template.slug,
    templateSlug: template.slug,
    productSpecifications: template.starterProducts.map((item, index) => ({ ...createProductSpecificationDraft(index, template.slug), code: `PS_${template.slug.toUpperCase().replace(/-/g, '_')}_${index + 1}`, name: item, caption: item })),
    productOfferings: [createProductOfferingDraft(0, specCode, template.slug)],
    productInventory: [createProductInventoryDraft(0, offeringCode, specCode, template.slug)],
    serviceSpecifications: template.starterServices.map((item, index) => ({ code: `SS_${template.slug.toUpperCase().replace(/-/g, '_')}_${index + 1}`, name: item, summary: `${item} service placeholder` })),
    resourceSpecifications: template.starterResources.map((item, index) => ({ code: `RS_${template.slug.toUpperCase().replace(/-/g, '_')}_${index + 1}`, name: item, summary: `${item} resource placeholder` })),
    characteristics: [{ ...DEFAULT_CHARACTERISTIC_DEFINITION, appliesTo: specCode, displayName: 'Display Name', name: 'displayName', interpretation: 'Generic starter characteristic; rename and extend per industry.' }],
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

  const activeTemplate = useMemo(() => templates.find((item) => item.slug === selectedSlug) || templates[0], [selectedSlug, templates]);

  function switchTemplate(nextSlug) {
    const nextTemplate = templates.find((item) => item.slug === nextSlug);
    if (!nextTemplate) return;
    setSelectedSlug(nextSlug);
    setBlueprint(createInitialBlueprint(nextTemplate));
    setSaveError('');
    setImportMessage('');
  }

  function updateField(key, value) { setBlueprint((prev) => ({ ...prev, [key]: value })); }

  async function importBlueprintFile(file) {
    setSaveError(''); setImportMessage('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) { setSaveError('Only .json blueprint files are supported.'); return; }
    try {
      const payload = JSON.parse(await file.text());
      const normalized = validateAndNormalizeBlueprintImport(payload, templates);
      setSelectedSlug(normalized.selectedSlug);
      setBlueprint(normalized.blueprint);
      setImportMessage(`Imported ${file.name}; ProductSpecification, ProductOffering and Product inventory sections are mapped.`);
    } catch (error) { setSaveError(error instanceof Error ? error.message : String(error)); }
  }

  function addProductSpecification() { setBlueprint((prev) => ({ ...prev, productSpecifications: [...prev.productSpecifications, createProductSpecificationDraft(prev.productSpecifications.length, selectedSlug)] })); }
  function updateProductSpecification(index, key, value) { setBlueprint((prev) => ({ ...prev, productSpecifications: prev.productSpecifications.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })); }
  function removeProductSpecification(index) { setBlueprint((prev) => ({ ...prev, productSpecifications: prev.productSpecifications.filter((_, itemIndex) => itemIndex !== index) })); }

  function addProductOffering() { setBlueprint((prev) => ({ ...prev, productOfferings: [...(prev.productOfferings || []), createProductOfferingDraft((prev.productOfferings || []).length, prev.productSpecifications[0]?.code || '', selectedSlug)] })); }
  function updateProductOffering(index, key, value) { setBlueprint((prev) => ({ ...prev, productOfferings: (prev.productOfferings || []).map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })); }
  function updateProductOfferingPrice(index, key, value) { setBlueprint((prev) => ({ ...prev, productOfferings: (prev.productOfferings || []).map((item, itemIndex) => itemIndex === index ? { ...item, price: { ...(item.price || {}), [key]: value } } : item) })); }
  function removeProductOffering(index) { setBlueprint((prev) => ({ ...prev, productOfferings: (prev.productOfferings || []).filter((_, itemIndex) => itemIndex !== index) })); }

  function addProductInventory() { setBlueprint((prev) => ({ ...prev, productInventory: [...(prev.productInventory || []), createProductInventoryDraft((prev.productInventory || []).length, (prev.productOfferings || [])[0]?.code || '', prev.productSpecifications[0]?.code || '', selectedSlug)] })); }
  function updateProductInventory(index, key, value) { setBlueprint((prev) => ({ ...prev, productInventory: (prev.productInventory || []).map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })); }
  function removeProductInventory(index) { setBlueprint((prev) => ({ ...prev, productInventory: (prev.productInventory || []).filter((_, itemIndex) => itemIndex !== index) })); }

  function addCharacteristic() { setBlueprint((prev) => ({ ...prev, characteristics: [...prev.characteristics, { ...DEFAULT_CHARACTERISTIC_DEFINITION, appliesTo: prev.productSpecifications[0]?.code || 'PS_PRIMARY' }] })); }
  function updateCharacteristic(index, key, value) { setBlueprint((prev) => ({ ...prev, characteristics: prev.characteristics.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })); }

  function buildBlueprintExportPayload() {
    return {
      catalog: { name: blueprint.catalogName, code: blueprint.catalogCode, industry: selectedSlug },
      templateFocus: activeTemplate.focus,
      productSpecifications: blueprint.productSpecifications,
      productOfferings: blueprint.productOfferings || [],
      productInventory: blueprint.productInventory || [],
      products: blueprint.productInventory || [],
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
    setSaving(true); setSaveError('');
    try {
      const response = await fetch('/api/catalogs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...blueprint, templateSlug: activeTemplate.slug }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Failed to persist the catalog blueprint.');
      router.push(`/catalogs/${payload.item.slug}`); router.refresh();
    } catch (error) { setSaveError(error instanceof Error ? error.message : String(error)); }
    finally { setSaving(false); }
  }

  return (
    <div className="builder-layout">
      <section className="card builder-sidebar">
        <p className="eyebrow">1. Choose industry</p>
        <div className="template-list">
          {templates.map((template) => (
            <button className={`template-button${template.slug === selectedSlug ? ' active' : ''}`} key={template.slug} onClick={() => switchTemplate(template.slug)} type="button">
              <strong>{template.title}</strong><span>{template.focus}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="builder-main">
        <Card title="2. Import from Blueprint JSON" description="Drop a TMF620/EPC blueprint JSON. The importer maps ProductSpecification, ProductOffering, Product inventory and characteristic sections.">
          <label className={`blueprint-dropzone${dragActive ? ' active' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); void importBlueprintFile(event.dataTransfer.files?.[0]); }}>
            <input type="file" accept="application/json,.json" onChange={(event) => void importBlueprintFile(event.target.files?.[0])} />
            <span className="blueprint-dropzone-title">Import from EPC / Blueprint JSON</span>
            <span className="blueprint-dropzone-copy">Drag and drop a .json file here, or click to browse.</span>
          </label>
          {importMessage ? <p className="success-text">{importMessage}</p> : null}
        </Card>

        <Card title="3. Define catalog shell" description="Name the catalog and confirm the starter industry template.">
          <div className="form-grid"><Input label="Catalog name" value={blueprint.catalogName} onChange={(e) => updateField('catalogName', e.target.value)} /><Input label="Catalog code" value={blueprint.catalogCode} onChange={(e) => updateField('catalogCode', e.target.value)} /></div>
          <p className="helper-text">Selected template focus: {activeTemplate.focus}</p>
        </Card>

        <Card title="4. Product Specification definitions" description="Define reusable ProductSpecification entities before commercial offerings." actions={<Button variant="secondary" size="sm" onClick={addProductSpecification}>Add Product Specification</Button>}>
          <div className="characteristic-editor">{blueprint.productSpecifications.map((item, index) => (
            <div className="characteristic-card" key={`${item.code}-${index}`}>
              <div className="section-heading-row"><div><p className="eyebrow">ProductSpecification #{index + 1}</p><h3>{item.name || 'Unnamed specification'}</h3></div><Button variant="ghost" size="sm" onClick={() => removeProductSpecification(index)}>Remove</Button></div>
              <div className="editable-grid triple-grid">
                <input placeholder="Code / id" value={item.code || ''} onChange={(e) => updateProductSpecification(index, 'code', e.target.value)} />
                <input placeholder="Name" value={item.name || ''} onChange={(e) => updateProductSpecification(index, 'name', e.target.value)} />
                <input placeholder="Caption" value={item.caption || ''} onChange={(e) => updateProductSpecification(index, 'caption', e.target.value)} />
                <input placeholder="Description" value={item.description || ''} onChange={(e) => updateProductSpecification(index, 'description', e.target.value)} />
                <input placeholder="Category" value={item.category || ''} onChange={(e) => updateProductSpecification(index, 'category', e.target.value)} />
                <input placeholder="Product type" value={item.productType || ''} onChange={(e) => updateProductSpecification(index, 'productType', e.target.value)} />
                <select value={item.lifecycleStatus || item.lifecycle || 'Draft'} onChange={(e) => { updateProductSpecification(index, 'lifecycleStatus', e.target.value); updateProductSpecification(index, 'lifecycle', e.target.value); }}>{EPC_LIFECYCLE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                <input placeholder="Version" value={item.version || ''} onChange={(e) => updateProductSpecification(index, 'version', e.target.value)} />
                <select value={String(Boolean(item.isBundle))} onChange={(e) => updateProductSpecification(index, 'isBundle', e.target.value === 'true')}><option value="false">Atomic specification</option><option value="true">Bundle specification</option></select>
                <input placeholder="Business model" value={item.businessModel || ''} onChange={(e) => updateProductSpecification(index, 'businessModel', e.target.value)} />
                <input placeholder="Valid from" type="date" value={item.validForStart || ''} onChange={(e) => updateProductSpecification(index, 'validForStart', e.target.value)} />
                <input placeholder="Valid to" type="date" value={item.validForEnd || ''} onChange={(e) => updateProductSpecification(index, 'validForEnd', e.target.value)} />
                <input placeholder="Fulfillment schema / CFS mapping" value={item.fulfillmentSchema || ''} onChange={(e) => updateProductSpecification(index, 'fulfillmentSchema', e.target.value)} />
                <input placeholder="Min cardinality" type="number" value={item.cardinalityMin ?? 0} onChange={(e) => updateProductSpecification(index, 'cardinalityMin', Number(e.target.value))} />
                <input placeholder="Max cardinality" type="number" value={item.cardinalityMax ?? 1} onChange={(e) => updateProductSpecification(index, 'cardinalityMax', Number(e.target.value))} />
              </div>
            </div>
          ))}</div>
        </Card>

        <Card title="5. Product Offering definitions" description="Define sellable ProductOffering entities with lifecycle, channel, market, terms and pricing fields." actions={<Button variant="secondary" size="sm" onClick={addProductOffering}>Add Product Offering</Button>}>
          <div className="characteristic-editor">{(blueprint.productOfferings || []).map((item, index) => (
            <div className="characteristic-card" key={`${item.code}-${index}`}>
              <div className="section-heading-row"><div><p className="eyebrow">ProductOffering #{index + 1}</p><h3>{item.name || 'Unnamed offering'}</h3></div><Button variant="ghost" size="sm" onClick={() => removeProductOffering(index)}>Remove</Button></div>
              <div className="editable-grid triple-grid">
                <input placeholder="Code / id" value={item.code || ''} onChange={(e) => updateProductOffering(index, 'code', e.target.value)} />
                <input placeholder="Name" value={item.name || ''} onChange={(e) => updateProductOffering(index, 'name', e.target.value)} />
                <input placeholder="Caption" value={item.caption || ''} onChange={(e) => updateProductOffering(index, 'caption', e.target.value)} />
                <select value={item.specificationCode || ''} onChange={(e) => updateProductOffering(index, 'specificationCode', e.target.value)}><option value="">Select ProductSpecification</option>{blueprint.productSpecifications.map((spec) => <option key={spec.code} value={spec.code}>{spec.code} — {spec.name}</option>)}</select>
                <select value={item.lifecycleStatus || item.status || 'Draft'} onChange={(e) => { updateProductOffering(index, 'lifecycleStatus', e.target.value); updateProductOffering(index, 'status', e.target.value); }}>{EPC_LIFECYCLE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                <input placeholder="Version" value={item.version || ''} onChange={(e) => updateProductOffering(index, 'version', e.target.value)} />
                <select value={String(Boolean(item.isSellable))} onChange={(e) => updateProductOffering(index, 'isSellable', e.target.value === 'true')}><option value="true">Sellable</option><option value="false">Not sellable</option></select>
                <select value={String(Boolean(item.isBundle))} onChange={(e) => updateProductOffering(index, 'isBundle', e.target.value === 'true')}><option value="false">Atomic offering</option><option value="true">Bundle offering</option></select>
                <input placeholder="Sale type" value={item.saleType || ''} onChange={(e) => updateProductOffering(index, 'saleType', e.target.value)} />
                <input placeholder="Activation mode" value={item.activationMode || ''} onChange={(e) => updateProductOffering(index, 'activationMode', e.target.value)} />
                <input placeholder="Channels, comma separated" value={(item.channels || []).join(', ')} onChange={(e) => updateProductOffering(index, 'channels', csvToArray(e.target.value))} list="epc-channels" />
                <input placeholder="Market segments, comma separated" value={(item.marketSegments || []).join(', ')} onChange={(e) => updateProductOffering(index, 'marketSegments', csvToArray(e.target.value))} />
                <input placeholder="Category" value={typeof item.category === 'string' ? item.category : 'Offering'} onChange={(e) => updateProductOffering(index, 'category', e.target.value)} />
                <input placeholder="Valid from" type="date" value={item.validForStart || ''} onChange={(e) => updateProductOffering(index, 'validForStart', e.target.value)} />
                <input placeholder="Valid to" type="date" value={item.validForEnd || ''} onChange={(e) => updateProductOffering(index, 'validForEnd', e.target.value)} />
                <input placeholder="Price name" value={item.price?.name || ''} onChange={(e) => updateProductOfferingPrice(index, 'name', e.target.value)} />
                <select value={item.price?.chargeType || 'RECURRING'} onChange={(e) => updateProductOfferingPrice(index, 'chargeType', e.target.value)}>{EPC_CHARGE_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
                <select value={item.price?.calculationMethod || 'FLAT_FEE'} onChange={(e) => updateProductOfferingPrice(index, 'calculationMethod', e.target.value)}>{EPC_PRICE_METHODS.map((method) => <option key={method}>{method}</option>)}</select>
                <input placeholder="Amount" type="number" value={item.price?.amount ?? 0} onChange={(e) => updateProductOfferingPrice(index, 'amount', Number(e.target.value))} />
                <input placeholder="Currency" value={item.price?.currency || 'HUF'} onChange={(e) => updateProductOfferingPrice(index, 'currency', e.target.value)} />
                <input placeholder="Recurrence" value={item.price?.recurrence || 'monthly'} onChange={(e) => updateProductOfferingPrice(index, 'recurrence', e.target.value)} />
                <input placeholder="Attribute formula / AST expression" value={item.price?.formula || ''} onChange={(e) => updateProductOfferingPrice(index, 'formula', e.target.value)} />
              </div>
            </div>
          ))}</div><datalist id="epc-channels">{EPC_CHANNELS.map((item) => <option key={item} value={item} />)}</datalist>
        </Card>

        <Card title="6. Product inventory / Product definitions" description="Create Product records: instantiated products that point back to an offering and a specification." actions={<Button variant="secondary" size="sm" onClick={addProductInventory}>Add Product</Button>}>
          <div className="characteristic-editor">{(blueprint.productInventory || []).map((item, index) => (
            <div className="characteristic-card" key={`${item.code}-${index}`}>
              <div className="section-heading-row"><div><p className="eyebrow">Product #{index + 1}</p><h3>{item.name || 'Unnamed product instance'}</h3></div><Button variant="ghost" size="sm" onClick={() => removeProductInventory(index)}>Remove</Button></div>
              <div className="editable-grid triple-grid">
                <input placeholder="Product id / code" value={item.code || item.id || ''} onChange={(e) => { updateProductInventory(index, 'code', e.target.value); updateProductInventory(index, 'id', e.target.value); }} />
                <input placeholder="Name" value={item.name || ''} onChange={(e) => updateProductInventory(index, 'name', e.target.value)} />
                <select value={item.productOfferingCode || ''} onChange={(e) => updateProductInventory(index, 'productOfferingCode', e.target.value)}><option value="">Select ProductOffering</option>{(blueprint.productOfferings || []).map((offering) => <option key={offering.code} value={offering.code}>{offering.code} — {offering.name}</option>)}</select>
                <select value={item.productSpecificationCode || ''} onChange={(e) => updateProductInventory(index, 'productSpecificationCode', e.target.value)}><option value="">Select ProductSpecification</option>{blueprint.productSpecifications.map((spec) => <option key={spec.code} value={spec.code}>{spec.code} — {spec.name}</option>)}</select>
                <select value={item.status || 'Created'} onChange={(e) => { updateProductInventory(index, 'status', e.target.value); updateProductInventory(index, 'lifecycleStatus', e.target.value); }}>{EPC_PRODUCT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                <input placeholder="Product type" value={item.productType || ''} onChange={(e) => updateProductInventory(index, 'productType', e.target.value)} />
                <input placeholder="Serial number" value={item.productSerialNumber || ''} onChange={(e) => updateProductInventory(index, 'productSerialNumber', e.target.value)} />
                <input placeholder="Service id" value={item.serviceId || ''} onChange={(e) => updateProductInventory(index, 'serviceId', e.target.value)} />
                <input placeholder="MSISDN / public identifier" value={item.msisdn || ''} onChange={(e) => updateProductInventory(index, 'msisdn', e.target.value)} />
                <input placeholder="Start date" type="date" value={item.startDate || ''} onChange={(e) => updateProductInventory(index, 'startDate', e.target.value)} />
                <input placeholder="Termination date" type="date" value={item.terminationDate || ''} onChange={(e) => updateProductInventory(index, 'terminationDate', e.target.value)} />
                <input placeholder="Place / installation address" value={item.place || ''} onChange={(e) => updateProductInventory(index, 'place', e.target.value)} />
                <input placeholder="Related party / customer" value={item.relatedParty || ''} onChange={(e) => updateProductInventory(index, 'relatedParty', e.target.value)} />
                <input placeholder="Billing account" value={item.billingAccount || ''} onChange={(e) => updateProductInventory(index, 'billingAccount', e.target.value)} />
              </div>
            </div>
          ))}</div>
        </Card>

        <Card title="7. Characteristics" description="Define universal characteristic metadata used by specs, offerings and inventory records." actions={<Button variant="secondary" size="sm" onClick={addCharacteristic}>Add characteristic</Button>}>
          <div className="characteristic-editor">{blueprint.characteristics.map((item, index) => (
            <div className="characteristic-card" key={`${item.name}-${index}`}><div className="editable-grid triple-grid">
              <input placeholder="Applies to" value={item.appliesTo} onChange={(e) => updateCharacteristic(index, 'appliesTo', e.target.value)} />
              <input placeholder="Display name" value={item.displayName || ''} onChange={(e) => updateCharacteristic(index, 'displayName', e.target.value)} />
              <input placeholder="Name" value={item.name} onChange={(e) => updateCharacteristic(index, 'name', e.target.value)} />
              <select value={item.valueType} onChange={(e) => updateCharacteristic(index, 'valueType', e.target.value)}>{EPC_VALUE_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
              <select value={String(item.configurable)} onChange={(e) => updateCharacteristic(index, 'configurable', e.target.value === 'true')}><option value="true">Configurable</option><option value="false">Non-configurable</option></select>
              <select value={item.configurableStage || item.stage || 'quotation'} onChange={(e) => { updateCharacteristic(index, 'configurableStage', e.target.value); updateCharacteristic(index, 'stage', e.target.value); }}>{EPC_CONFIG_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select>
              <select value={item.presence || 'optional'} onChange={(e) => updateCharacteristic(index, 'presence', e.target.value)}>{EPC_PRESENCE_TYPES.map((presence) => <option key={presence}>{presence}</option>)}</select>
              <input placeholder="Min cardinality" type="number" value={item.minCardinality ?? 0} onChange={(e) => updateCharacteristic(index, 'minCardinality', Number(e.target.value))} />
              <input placeholder="Max cardinality" type="number" value={item.maxCardinality ?? 1} onChange={(e) => updateCharacteristic(index, 'maxCardinality', Number(e.target.value))} />
              <input placeholder="Default value" value={item.defaultValue ?? ''} onChange={(e) => updateCharacteristic(index, 'defaultValue', e.target.value)} />
              <input placeholder="Allowed values, comma separated" value={(item.allowedValues || []).join(', ')} onChange={(e) => updateCharacteristic(index, 'allowedValues', csvToArray(e.target.value))} />
              <input placeholder="Interpretation" value={item.interpretation} onChange={(e) => updateCharacteristic(index, 'interpretation', e.target.value)} />
            </div></div>
          ))}</div>
        </Card>

        <Card title="8. Persist or export" description="Persist the catalog into Supabase or export a portable JSON blueprint." actions={<div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}><Button onClick={saveCatalog} loading={saving}>Save to Supabase</Button><Button variant="secondary" onClick={downloadBlueprint}>Download JSON</Button></div>}>
          {saveError ? <p className="ds-field__error">{saveError}</p> : null}
          <pre className="json-block builder-json">{JSON.stringify(buildBlueprintExportPayload(), null, 2)}</pre>
        </Card>
      </section>
    </div>
  );
}
