'use client';

import { useMemo, useState } from 'react';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import {
  EPC_CHANNELS,
  EPC_LIFECYCLE_STATUSES,
  EPC_PRODUCT_STATUSES,
  createProductInventoryDraft,
  createProductOfferingDraft,
  createProductSpecificationDraft,
  epcCodeFragment,
} from '../../../lib/epcEntityDefinitions';
import styles from './EntityManagementClient.module.css';

const ENTITY_TABS = [
  { key: 'productSpecifications', label: 'Product Specifications', singular: 'Product Specification' },
  { key: 'productOfferings', label: 'Product Offerings', singular: 'Product Offering' },
  { key: 'productInventory', label: 'Products / Inventory', singular: 'Product' },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionLabel(item) {
  if (!item) return '';
  return `${item.name || item.code || item.id} (${item.code || item.id || 'no-code'})`;
}

function entityKey(entity) {
  return entity?.code || entity?.id || entity?.name;
}

function normalizeSpec(draft) {
  const code = draft.code || `PS_${epcCodeFragment(draft.name, 'PRODUCT')}`;
  return {
    ...draft,
    code,
    id: draft.id || code,
    name: draft.name || code,
    type: draft.type || 'ProductSpecification',
    category: draft.category || 'ProductSpecification',
    lifecycle: draft.lifecycle || draft.lifecycleStatus || 'Draft',
    lifecycleStatus: draft.lifecycleStatus || draft.lifecycle || 'Draft',
    version: draft.version || '1',
    characteristics: asArray(draft.characteristics),
  };
}

function normalizeOffering(draft) {
  const code = draft.code || `PO_${epcCodeFragment(draft.name, 'OFFERING')}`;
  const channels = Array.isArray(draft.channels) ? draft.channels : splitCsv(draft.channelsText);
  return {
    ...draft,
    code,
    id: draft.id || code,
    name: draft.name || code,
    lifecycleStatus: draft.lifecycleStatus || draft.status || 'Draft',
    status: draft.status || draft.lifecycleStatus || 'Draft',
    version: draft.version || '1',
    specificationCode: draft.specificationCode || draft.productSpecificationCode || '',
    validFor: draft.validFor || 'open-ended',
    channels,
    priceSummary: draft.priceSummary || 'Define pricing',
  };
}

function normalizeProduct(draft) {
  const code = draft.code || draft.id || `PR_${epcCodeFragment(draft.name, 'PRODUCT')}`;
  return {
    ...draft,
    code,
    id: draft.id || code,
    name: draft.name || code,
    productOfferingCode: draft.productOfferingCode || draft.productOffering?.id || '',
    productSpecificationCode: draft.productSpecificationCode || draft.productSpecification?.id || '',
    status: draft.status || draft.lifecycleStatus || 'Created',
    lifecycleStatus: draft.lifecycleStatus || draft.status || 'Created',
    characteristicValues:
      draft.characteristicValues && typeof draft.characteristicValues === 'object'
        ? draft.characteristicValues
        : {},
  };
}

function toJsonText(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonObject(value, fallback = {}) {
  if (!String(value || '').trim()) return fallback;
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON field must contain an object.');
  }
  return parsed;
}

export default function EntityManagementClient({
  catalogSlug,
  catalogTitle,
  initialProductSpecifications,
  initialProductOfferings,
  initialProducts,
}) {
  const [activeTab, setActiveTab] = useState('productSpecifications');
  const [productSpecifications, setProductSpecifications] = useState(asArray(initialProductSpecifications));
  const [productOfferings, setProductOfferings] = useState(asArray(initialProductOfferings));
  const [productInventory, setProductInventory] = useState(asArray(initialProducts));
  const [editingKey, setEditingKey] = useState('');
  const [draft, setDraft] = useState(() => createProductSpecificationDraft(asArray(initialProductSpecifications).length, catalogSlug));
  const [jsonDraft, setJsonDraft] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const activeMeta = ENTITY_TABS.find((tab) => tab.key === activeTab) || ENTITY_TABS[0];

  const activeItems = useMemo(() => {
    if (activeTab === 'productOfferings') return productOfferings;
    if (activeTab === 'productInventory') return productInventory;
    return productSpecifications;
  }, [activeTab, productInventory, productOfferings, productSpecifications]);

  function makeBlank(tab = activeTab) {
    if (tab === 'productOfferings') {
      return createProductOfferingDraft(productOfferings.length, productSpecifications[0]?.code || '', catalogSlug);
    }
    if (tab === 'productInventory') {
      const primaryOffering = productOfferings[0];
      const primarySpec = productSpecifications.find((item) => item.code === primaryOffering?.specificationCode) || productSpecifications[0];
      return createProductInventoryDraft(productInventory.length, primaryOffering?.code || '', primarySpec?.code || '', catalogSlug);
    }
    return createProductSpecificationDraft(productSpecifications.length, catalogSlug);
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setEditingKey('');
    const blank = makeBlank(tab);
    setDraft(blank);
    setJsonDraft(toJsonText(blank.characteristicValues || {}));
    setError('');
    setNotice('');
  }

  function editItem(item) {
    const nextDraft = clone(item);
    setEditingKey(entityKey(nextDraft));
    setDraft(nextDraft);
    setJsonDraft(toJsonText(nextDraft.characteristicValues || nextDraft.price || {}));
    setError('');
    setNotice('');
  }

  function resetForm() {
    const blank = makeBlank();
    setEditingKey('');
    setDraft(blank);
    setJsonDraft(toJsonText(activeTab === 'productInventory' ? blank.characteristicValues : blank.price || {}));
    setError('');
  }

  function updateDraft(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function persist(nextState) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/catalogs/${catalogSlug}/entities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextState),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Entity save failed.');
      }
      setProductSpecifications(payload.item.productSpecifications || nextState.productSpecifications || []);
      setProductOfferings(payload.item.productOfferings || nextState.productOfferings || []);
      setProductInventory(payload.item.productInventory || nextState.productInventory || []);
      setNotice('Saved. The existing catalog was updated without recreating it.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    try {
      let normalized;
      let nextSpecs = productSpecifications;
      let nextOfferings = productOfferings;
      let nextProducts = productInventory;

      if (activeTab === 'productSpecifications') {
        normalized = normalizeSpec(draft);
        nextSpecs = [...productSpecifications.filter((item) => entityKey(item) !== editingKey && item.code !== normalized.code), normalized];
        setProductSpecifications(nextSpecs);
      }

      if (activeTab === 'productOfferings') {
        const priceObject = parseJsonObject(jsonDraft, draft.price || {});
        normalized = normalizeOffering({ ...draft, price: priceObject });
        nextOfferings = [...productOfferings.filter((item) => entityKey(item) !== editingKey && item.code !== normalized.code), normalized];
        setProductOfferings(nextOfferings);
      }

      if (activeTab === 'productInventory') {
        const characteristicValues = parseJsonObject(jsonDraft, draft.characteristicValues || {});
        normalized = normalizeProduct({ ...draft, characteristicValues });
        nextProducts = [...productInventory.filter((item) => entityKey(item) !== editingKey && entityKey(item) !== normalized.code), normalized];
        setProductInventory(nextProducts);
      }

      await persist({
        productSpecifications: nextSpecs,
        productOfferings: nextOfferings,
        productInventory: nextProducts,
      });
      setEditingKey(entityKey(normalized));
      setDraft(normalized);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : String(draftError));
    }
  }

  async function deleteItem(item) {
    const key = entityKey(item);
    if (!key) return;
    let nextSpecs = productSpecifications;
    let nextOfferings = productOfferings;
    let nextProducts = productInventory;

    if (activeTab === 'productSpecifications') {
      nextSpecs = productSpecifications.filter((candidate) => entityKey(candidate) !== key);
      setProductSpecifications(nextSpecs);
    }
    if (activeTab === 'productOfferings') {
      nextOfferings = productOfferings.filter((candidate) => entityKey(candidate) !== key);
      setProductOfferings(nextOfferings);
    }
    if (activeTab === 'productInventory') {
      nextProducts = productInventory.filter((candidate) => entityKey(candidate) !== key);
      setProductInventory(nextProducts);
    }

    await persist({ productSpecifications: nextSpecs, productOfferings: nextOfferings, productInventory: nextProducts });
    resetForm();
  }

  const summary = [
    ['Product Specifications', productSpecifications.length],
    ['Product Offerings', productOfferings.length],
    ['Products / Inventory', productInventory.length],
  ];

  return (
    <div className={styles.managerShell}>
      <section className={styles.summaryGrid} aria-label="Entity counts">
        {summary.map(([label, count]) => (
          <Card key={label} padding="md" className={styles.summaryCard}>
            <span className={styles.summaryValue}>{count}</span>
            <span className={styles.summaryLabel}>{label}</span>
          </Card>
        ))}
      </section>

      {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      <div className={styles.tabList} role="tablist" aria-label={`${catalogTitle} entity types`}>
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={activeTab === tab.key ? styles.activeTab : styles.tab}
            onClick={() => switchTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        <Card title={activeMeta.label} description="Select an existing record to edit it, or remove records that should no longer belong to this catalog." padding="md">
          <div className={styles.entityList}>
            {activeItems.length ? activeItems.map((item) => (
              <article key={entityKey(item)} className={styles.entityRow}>
                <div>
                  <strong>{item.name || entityKey(item)}</strong>
                  <code>{entityKey(item)}</code>
                  <p>{item.summary || item.description || item.status || item.lifecycleStatus || 'No description yet.'}</p>
                </div>
                <div className={styles.rowActions}>
                  <Button variant="secondary" size="sm" onClick={() => editItem(item)}>Edit</Button>
                  <Button variant="secondary" size="sm" onClick={() => deleteItem(item)}>Remove</Button>
                </div>
              </article>
            )) : (
              <div className={styles.emptyState}>No {activeMeta.singular.toLowerCase()} records yet. Create the first one on the right.</div>
            )}
          </div>
        </Card>

        <Card
          title={editingKey ? `Edit ${activeMeta.singular}` : `Create ${activeMeta.singular}`}
          description="Fields use the uploaded EPC defaults: specification, offering and product are kept separate and can carry dynamic JSON characteristics."
          padding="md"
          actions={<Button variant="secondary" size="sm" onClick={resetForm}>New</Button>}
        >
          <div className={styles.formGrid}>
            {activeTab === 'productSpecifications' ? (
              <>
                <Input label="Code" value={draft.code || ''} onChange={(event) => updateDraft('code', event.target.value)} />
                <Input label="Name" value={draft.name || ''} onChange={(event) => updateDraft('name', event.target.value)} />
                <Input label="Category" value={draft.category || ''} onChange={(event) => updateDraft('category', event.target.value)} />
                <label className={styles.field}>Lifecycle
                  <select value={draft.lifecycle || draft.lifecycleStatus || 'Draft'} onChange={(event) => { updateDraft('lifecycle', event.target.value); updateDraft('lifecycleStatus', event.target.value); }}>
                    {EPC_LIFECYCLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <Input label="Business model" value={draft.businessModel || ''} onChange={(event) => updateDraft('businessModel', event.target.value)} />
                <Input label="Product type" value={draft.productType || ''} onChange={(event) => updateDraft('productType', event.target.value)} />
                <label className={styles.checkboxField}><input type="checkbox" checked={Boolean(draft.isBundle)} onChange={(event) => updateDraft('isBundle', event.target.checked)} /> Bundle specification</label>
                <label className={styles.wideField}>Description
                  <textarea value={draft.description || draft.summary || ''} onChange={(event) => { updateDraft('description', event.target.value); updateDraft('summary', event.target.value); }} />
                </label>
              </>
            ) : null}

            {activeTab === 'productOfferings' ? (
              <>
                <Input label="Code" value={draft.code || ''} onChange={(event) => updateDraft('code', event.target.value)} />
                <Input label="Name" value={draft.name || ''} onChange={(event) => updateDraft('name', event.target.value)} />
                <label className={styles.field}>Product Specification
                  <select value={draft.specificationCode || ''} onChange={(event) => updateDraft('specificationCode', event.target.value)}>
                    <option value="">Select specification</option>
                    {productSpecifications.map((spec) => <option key={spec.code} value={spec.code}>{optionLabel(spec)}</option>)}
                  </select>
                </label>
                <label className={styles.field}>Status
                  <select value={draft.status || draft.lifecycleStatus || 'Draft'} onChange={(event) => { updateDraft('status', event.target.value); updateDraft('lifecycleStatus', event.target.value); }}>
                    {EPC_LIFECYCLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <Input label="Valid for" value={draft.validFor || ''} onChange={(event) => updateDraft('validFor', event.target.value)} />
                <Input label="Price summary" value={draft.priceSummary || ''} onChange={(event) => updateDraft('priceSummary', event.target.value)} />
                <label className={styles.field}>Channels
                  <select multiple value={draft.channels || []} onChange={(event) => updateDraft('channels', Array.from(event.target.selectedOptions).map((option) => option.value))}>
                    {EPC_CHANNELS.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                  </select>
                </label>
                <label className={styles.checkboxField}><input type="checkbox" checked={draft.isSellable !== false} onChange={(event) => updateDraft('isSellable', event.target.checked)} /> Sellable</label>
                <label className={styles.wideField}>Pricing JSON
                  <textarea value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} />
                </label>
              </>
            ) : null}

            {activeTab === 'productInventory' ? (
              <>
                <Input label="Product ID / Code" value={draft.code || draft.id || ''} onChange={(event) => { updateDraft('code', event.target.value); updateDraft('id', event.target.value); }} />
                <Input label="Name" value={draft.name || ''} onChange={(event) => updateDraft('name', event.target.value)} />
                <label className={styles.field}>Product Offering
                  <select value={draft.productOfferingCode || ''} onChange={(event) => {
                    const offering = productOfferings.find((item) => item.code === event.target.value);
                    updateDraft('productOfferingCode', event.target.value);
                    if (offering?.specificationCode) updateDraft('productSpecificationCode', offering.specificationCode);
                  }}>
                    <option value="">Select offering</option>
                    {productOfferings.map((offering) => <option key={offering.code} value={offering.code}>{optionLabel(offering)}</option>)}
                  </select>
                </label>
                <label className={styles.field}>Product Specification
                  <select value={draft.productSpecificationCode || ''} onChange={(event) => updateDraft('productSpecificationCode', event.target.value)}>
                    <option value="">Select specification</option>
                    {productSpecifications.map((spec) => <option key={spec.code} value={spec.code}>{optionLabel(spec)}</option>)}
                  </select>
                </label>
                <label className={styles.field}>Status
                  <select value={draft.status || 'Created'} onChange={(event) => { updateDraft('status', event.target.value); updateDraft('lifecycleStatus', event.target.value); }}>
                    {EPC_PRODUCT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <Input label="Serial number" value={draft.productSerialNumber || ''} onChange={(event) => updateDraft('productSerialNumber', event.target.value)} />
                <Input label="Service ID" value={draft.serviceId || ''} onChange={(event) => updateDraft('serviceId', event.target.value)} />
                <Input label="Place" value={draft.place || ''} onChange={(event) => updateDraft('place', event.target.value)} />
                <Input label="Customer / related party" value={draft.relatedParty || ''} onChange={(event) => updateDraft('relatedParty', event.target.value)} />
                <label className={styles.wideField}>Characteristic values JSON
                  <textarea value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} />
                </label>
              </>
            ) : null}
          </div>

          <div className={styles.formActions}>
            <Button loading={saving} onClick={saveDraft}>{editingKey ? 'Save changes' : 'Create entity'}</Button>
            <Button variant="secondary" onClick={resetForm}>Reset form</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
