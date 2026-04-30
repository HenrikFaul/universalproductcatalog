'use client';

import { useMemo, useState } from 'react';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Modal from '../../../../components/ui/Modal';
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
  {
    key: 'productSpecifications',
    label: 'Product Specifications',
    singular: 'Product Specification',
    helper: 'Define reusable product/service templates, BOM roots and inherited EPC characteristics.',
  },
  {
    key: 'productOfferings',
    label: 'Product Offerings',
    singular: 'Product Offering',
    helper: 'Create the sellable commercial layer connected to a Product Specification, pricing and channels.',
  },
  {
    key: 'productInventory',
    label: 'Products / Inventory',
    singular: 'Product',
    helper: 'Create instantiated products that point to an offering/specification and carry inventory characteristic values.',
  },
];

const LIFECYCLE_COLORS = {
  Draft: 'draft',
  Active: 'active',
  Launched: 'active',
  Retired: 'retired',
  Obsolete: 'retired',
  Created: 'active',
  Pending: 'pending',
  Terminated: 'retired',
};

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

function entityKey(entity) {
  return entity?.code || entity?.id || entity?.name;
}

function optionLabel(item) {
  if (!item) return '';
  return `${item.name || item.code || item.id} · ${item.code || item.id || 'no-code'}`;
}

function normalizeSpec(draft) {
  const code = draft.code || `PS_${epcCodeFragment(draft.name, 'PRODUCT')}`;
  return {
    ...draft,
    code,
    id: draft.id || code,
    name: draft.name || code,
    caption: draft.caption || draft.name || code,
    description: draft.description || draft.summary || '',
    summary: draft.summary || draft.description || '',
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
    caption: draft.caption || draft.name || code,
    description: draft.description || draft.summary || '',
    summary: draft.summary || draft.description || '',
    lifecycleStatus: draft.lifecycleStatus || draft.status || 'Draft',
    status: draft.status || draft.lifecycleStatus || 'Draft',
    version: draft.version || '1',
    specificationCode: draft.specificationCode || draft.productSpecificationCode || '',
    validFor: draft.validFor || 'open-ended',
    channels,
    priceSummary: draft.priceSummary || 'Define pricing',
    price: draft.price && typeof draft.price === 'object' ? draft.price : {},
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
    productType: draft.productType || 'SERVICE',
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
    throw new Error('JSON field must be an object. Example: { "bandwidth": "1 Gbps" }');
  }
  return parsed;
}

function itemSubtitle(item, type) {
  if (type === 'productOfferings') {
    return `Spec: ${item.specificationCode || 'none'} · ${item.status || item.lifecycleStatus || 'Draft'} · ${(item.channels || []).join(', ') || 'no channel'}`;
  }
  if (type === 'productInventory') {
    return `Offering: ${item.productOfferingCode || 'none'} · Spec: ${item.productSpecificationCode || 'none'} · ${item.status || 'Created'}`;
  }
  return `${item.lifecycle || item.lifecycleStatus || 'Draft'} · ${item.category || 'ProductSpecification'}${item.isBundle ? ' · bundle' : ''}`;
}

function lifecycleStatus(item, type) {
  if (type === 'productOfferings') return item.status || item.lifecycleStatus || 'Draft';
  if (type === 'productInventory') return item.status || 'Created';
  return item.lifecycle || item.lifecycleStatus || 'Draft';
}

function SelectField({ label, children, ...props }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.selectWrap}>
        <select className={styles.select} {...props}>{children}</select>
      </span>
    </label>
  );
}

function CheckboxGroup({ label, options, selected, onChange }) {
  const selectedSet = new Set(selected || []);
  return (
    <fieldset className={styles.checkboxGroup}>
      <legend className={styles.fieldLabel}>{label}</legend>
      <div className={styles.checkboxGrid}>
        {options.map((option) => (
          <label key={option} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedSet.has(option)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selected, option]
                  : selected.filter((item) => item !== option);
                onChange(next);
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
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
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeMeta = ENTITY_TABS.find((tab) => tab.key === activeTab) || ENTITY_TABS[0];

  const activeItems = useMemo(() => {
    if (activeTab === 'productOfferings') return productOfferings;
    if (activeTab === 'productInventory') return productInventory;
    return productSpecifications;
  }, [activeTab, productInventory, productOfferings, productSpecifications]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return activeItems;
    return activeItems.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  }, [activeItems, query]);

  const summary = [
    ['Product Specifications', productSpecifications.length, 'Reusable technical/logical templates'],
    ['Product Offerings', productOfferings.length, 'Sellable commercial records'],
    ['Products / Inventory', productInventory.length, 'Instantiated product records'],
  ];

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

  function jsonFor(tab, item) {
    if (tab === 'productOfferings') return toJsonText(item.price || {});
    if (tab === 'productInventory') return toJsonText(item.characteristicValues || {});
    return toJsonText(item.characteristics || {});
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setEditingKey('');
    const blank = makeBlank(tab);
    setDraft(blank);
    setJsonDraft(jsonFor(tab, blank));
    setQuery('');
    setError('');
    setNotice('');
  }

  function editItem(item) {
    const nextDraft = clone(item);
    setEditingKey(entityKey(nextDraft));
    setDraft(nextDraft);
    setJsonDraft(jsonFor(activeTab, nextDraft));
    setError('');
    setNotice('');
  }

  function resetForm() {
    const blank = makeBlank();
    setEditingKey('');
    setDraft(blank);
    setJsonDraft(jsonFor(activeTab, blank));
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
      setNotice('Saved. The existing catalog was updated without regeneration.');
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
        const characteristicsObject = parseJsonObject(jsonDraft, {});
        normalized = normalizeSpec({ ...draft, characteristics: Object.keys(characteristicsObject).length ? characteristicsObject : draft.characteristics });
        nextSpecs = [...productSpecifications.filter((item) => entityKey(item) !== editingKey && item.code !== normalized.code), normalized];
      }

      if (activeTab === 'productOfferings') {
        const priceObject = parseJsonObject(jsonDraft, draft.price || {});
        normalized = normalizeOffering({ ...draft, price: priceObject });
        nextOfferings = [...productOfferings.filter((item) => entityKey(item) !== editingKey && item.code !== normalized.code), normalized];
      }

      if (activeTab === 'productInventory') {
        const characteristicValues = parseJsonObject(jsonDraft, draft.characteristicValues || {});
        normalized = normalizeProduct({ ...draft, characteristicValues });
        nextProducts = [...productInventory.filter((item) => entityKey(item) !== editingKey && entityKey(item) !== normalized.code), normalized];
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    const key = entityKey(deleteTarget);
    if (!key) return;
    let nextSpecs = productSpecifications;
    let nextOfferings = productOfferings;
    let nextProducts = productInventory;

    if (activeTab === 'productSpecifications') {
      nextSpecs = productSpecifications.filter((candidate) => entityKey(candidate) !== key);
    }
    if (activeTab === 'productOfferings') {
      nextOfferings = productOfferings.filter((candidate) => entityKey(candidate) !== key);
    }
    if (activeTab === 'productInventory') {
      nextProducts = productInventory.filter((candidate) => entityKey(candidate) !== key);
    }

    setProductSpecifications(nextSpecs);
    setProductOfferings(nextOfferings);
    setProductInventory(nextProducts);
    setDeleteTarget(null);
    await persist({ productSpecifications: nextSpecs, productOfferings: nextOfferings, productInventory: nextProducts });
    resetForm();
  }

  return (
    <div className={styles.managerShell}>
      <section className={styles.summaryGrid} aria-label="Entity counts">
        {summary.map(([label, count, description]) => (
          <Card key={label} padding="md" className={styles.summaryCard}>
            <span className={styles.summaryValue}>{count}</span>
            <span className={styles.summaryLabel}>{label}</span>
            <span className={styles.summaryDescription}>{description}</span>
          </Card>
        ))}
      </section>

      {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      <Card padding="md" className={styles.workspaceCard}>
        <div className={styles.workspaceHeader}>
          <div>
            <p className={styles.kicker}>Catalog entity management</p>
            <h2>{activeMeta.label}</h2>
            <p>{activeMeta.helper}</p>
          </div>
          <Button onClick={resetForm}>New {activeMeta.singular}</Button>
        </div>

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

        <div className={styles.managementGrid}>
          <section className={styles.listPane} aria-label={`${activeMeta.label} list`}>
            <div className={styles.panelTopline}>
              <div>
                <h3>Records</h3>
                <p>{filteredItems.length} shown from {activeItems.length}</p>
              </div>
            </div>
            <Input
              label="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, code, status, price, customer..."
            />
            <div className={styles.entityList}>
              {filteredItems.length ? filteredItems.map((item) => {
                const isSelected = editingKey === entityKey(item);
                const status = lifecycleStatus(item, activeTab);
                const colorKey = LIFECYCLE_COLORS[status] || 'draft';
                return (
                  <article
                    key={entityKey(item)}
                    className={`${styles.entityRow} ${isSelected ? styles.selectedRow : ''}`}
                  >
                    <button type="button" className={styles.entityMain} onClick={() => editItem(item)}>
                      <div className={styles.entityTopline}>
                        <span className={styles.entityName}>{item.name || entityKey(item)}</span>
                        <span className={`${styles.statusBadge} ${styles[`statusBadge--${colorKey}`]}`}>{status}</span>
                      </div>
                      <code>{entityKey(item)}</code>
                      <span className={styles.entityMeta}>{itemSubtitle(item, activeTab)}</span>
                    </button>
                    {!isSelected ? (
                      <div className={styles.rowActions}>
                        <Button variant="secondary" size="sm" onClick={() => editItem(item)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item)}>Remove</Button>
                      </div>
                    ) : (
                      <div className={styles.rowActions}>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item)}>Remove</Button>
                      </div>
                    )}
                  </article>
                );
              }) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>○</span>
                  <p>No {activeMeta.singular.toLowerCase()} records found.</p>
                  <Button size="sm" onClick={resetForm}>Create first {activeMeta.singular.toLowerCase()}</Button>
                </div>
              )}
            </div>
          </section>

          <section className={styles.editorPane} aria-label={`${activeMeta.singular} editor`}>
            <div className={styles.panelTopline}>
              <div>
                <h3>{editingKey ? `Edit ${activeMeta.singular}` : `Create ${activeMeta.singular}`}</h3>
                <p>Fields follow the EPC model: Specification ≠ Offering ≠ Product instance.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              {activeTab === 'productSpecifications' ? (
                <>
                  <Input label="Code" value={draft.code || ''} onChange={(event) => updateDraft('code', event.target.value)} />
                  <Input label="Name" value={draft.name || ''} onChange={(event) => updateDraft('name', event.target.value)} />
                  <Input label="Category" value={draft.category || ''} onChange={(event) => updateDraft('category', event.target.value)} />
                  <Input label="Version" value={draft.version || ''} onChange={(event) => updateDraft('version', event.target.value)} />
                  <SelectField label="Lifecycle" value={draft.lifecycle || draft.lifecycleStatus || 'Draft'} onChange={(event) => { updateDraft('lifecycle', event.target.value); updateDraft('lifecycleStatus', event.target.value); }}>
                    {EPC_LIFECYCLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </SelectField>
                  <Input label="Business model" value={draft.businessModel || ''} onChange={(event) => updateDraft('businessModel', event.target.value)} />
                  <Input label="Product type" value={draft.productType || ''} onChange={(event) => updateDraft('productType', event.target.value)} />
                  <Input label="Brand" value={draft.brand || ''} onChange={(event) => updateDraft('brand', event.target.value)} />
                  <label className={styles.checkboxField}><input type="checkbox" checked={Boolean(draft.isBundle)} onChange={(event) => updateDraft('isBundle', event.target.checked)} /> <span>Bundle specification</span></label>
                  <label className={`${styles.wideField} ${styles.field}`}>
                    <span className={styles.fieldLabel}>Description</span>
                    <textarea className={styles.textarea} value={draft.description || draft.summary || ''} onChange={(event) => { updateDraft('description', event.target.value); updateDraft('summary', event.target.value); }} />
                  </label>
                  <label className={`${styles.wideField} ${styles.field}`}>
                    <span className={styles.fieldLabel}>Characteristics JSON / EAV defaults</span>
                    <textarea className={`${styles.textarea} ${styles.codeTextarea}`} value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} />
                  </label>
                </>
              ) : null}

              {activeTab === 'productOfferings' ? (
                <>
                  <Input label="Code" value={draft.code || ''} onChange={(event) => updateDraft('code', event.target.value)} />
                  <Input label="Name" value={draft.name || ''} onChange={(event) => updateDraft('name', event.target.value)} />
                  <SelectField label="Product Specification" value={draft.specificationCode || ''} onChange={(event) => updateDraft('specificationCode', event.target.value)}>
                    <option value="">Select specification</option>
                    {productSpecifications.map((spec) => <option key={spec.code} value={spec.code}>{optionLabel(spec)}</option>)}
                  </SelectField>
                  <SelectField label="Status" value={draft.status || draft.lifecycleStatus || 'Draft'} onChange={(event) => { updateDraft('status', event.target.value); updateDraft('lifecycleStatus', event.target.value); }}>
                    {EPC_LIFECYCLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </SelectField>
                  <Input label="Version" value={draft.version || ''} onChange={(event) => updateDraft('version', event.target.value)} />
                  <Input label="Valid for" value={draft.validFor || ''} onChange={(event) => updateDraft('validFor', event.target.value)} />
                  <Input label="Price summary" value={draft.priceSummary || ''} onChange={(event) => updateDraft('priceSummary', event.target.value)} />
                  <Input label="Sale type" value={draft.saleType || ''} onChange={(event) => updateDraft('saleType', event.target.value)} />
                  <div className={styles.wideField}>
                    <CheckboxGroup
                      label="Channels"
                      options={EPC_CHANNELS}
                      selected={draft.channels || []}
                      onChange={(next) => updateDraft('channels', next)}
                    />
                  </div>
                  <label className={styles.checkboxField}><input type="checkbox" checked={draft.isSellable !== false} onChange={(event) => updateDraft('isSellable', event.target.checked)} /> <span>Sellable</span></label>
                  <label className={`${styles.wideField} ${styles.field}`}>
                    <span className={styles.fieldLabel}>Description</span>
                    <textarea className={styles.textarea} value={draft.description || draft.summary || ''} onChange={(event) => { updateDraft('description', event.target.value); updateDraft('summary', event.target.value); }} />
                  </label>
                  <label className={`${styles.wideField} ${styles.field}`}>
                    <span className={styles.fieldLabel}>Pricing JSON</span>
                    <textarea className={`${styles.textarea} ${styles.codeTextarea}`} value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} />
                  </label>
                </>
              ) : null}

              {activeTab === 'productInventory' ? (
                <>
                  <Input label="Product ID / Code" value={draft.code || draft.id || ''} onChange={(event) => { updateDraft('code', event.target.value); updateDraft('id', event.target.value); }} />
                  <Input label="Name" value={draft.name || ''} onChange={(event) => updateDraft('name', event.target.value)} />
                  <SelectField label="Product Offering" value={draft.productOfferingCode || ''} onChange={(event) => {
                    const offering = productOfferings.find((item) => item.code === event.target.value);
                    updateDraft('productOfferingCode', event.target.value);
                    if (offering?.specificationCode) updateDraft('productSpecificationCode', offering.specificationCode);
                  }}>
                    <option value="">Select offering</option>
                    {productOfferings.map((offering) => <option key={offering.code} value={offering.code}>{optionLabel(offering)}</option>)}
                  </SelectField>
                  <SelectField label="Product Specification" value={draft.productSpecificationCode || ''} onChange={(event) => updateDraft('productSpecificationCode', event.target.value)}>
                    <option value="">Select specification</option>
                    {productSpecifications.map((spec) => <option key={spec.code} value={spec.code}>{optionLabel(spec)}</option>)}
                  </SelectField>
                  <SelectField label="Status" value={draft.status || 'Created'} onChange={(event) => { updateDraft('status', event.target.value); updateDraft('lifecycleStatus', event.target.value); }}>
                    {EPC_PRODUCT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </SelectField>
                  <Input label="Product type" value={draft.productType || ''} onChange={(event) => updateDraft('productType', event.target.value)} />
                  <Input label="Serial number" value={draft.productSerialNumber || ''} onChange={(event) => updateDraft('productSerialNumber', event.target.value)} />
                  <Input label="Service ID" value={draft.serviceId || ''} onChange={(event) => updateDraft('serviceId', event.target.value)} />
                  <Input label="MSISDN / logical ID" value={draft.msisdn || ''} onChange={(event) => updateDraft('msisdn', event.target.value)} />
                  <Input label="Place" value={draft.place || ''} onChange={(event) => updateDraft('place', event.target.value)} />
                  <Input label="Customer / related party" value={typeof draft.relatedParty === 'string' ? draft.relatedParty : draft.relatedParty?.name || ''} onChange={(event) => updateDraft('relatedParty', event.target.value)} />
                  <Input label="Billing account" value={draft.billingAccount || ''} onChange={(event) => updateDraft('billingAccount', event.target.value)} />
                  <label className={`${styles.wideField} ${styles.field}`}>
                    <span className={styles.fieldLabel}>Characteristic values JSON</span>
                    <textarea className={`${styles.textarea} ${styles.codeTextarea}`} value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} />
                  </label>
                </>
              ) : null}
            </div>

            <div className={styles.formActions}>
              <Button loading={saving} onClick={saveDraft}>{editingKey ? 'Save changes' : `Create ${activeMeta.singular}`}</Button>
              <Button variant="secondary" onClick={resetForm}>Clear / new</Button>
            </div>
          </section>
        </div>
      </Card>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Remove ${activeMeta.singular}`}
        description={`This will permanently delete "${deleteTarget?.name || deleteTarget?.code}" from the catalog. This action cannot be undone.`}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={saving} onClick={confirmDelete}>Remove permanently</Button>
          </>
        )}
      >
        <p className={styles.deleteWarning}>
          You are removing <strong>{deleteTarget?.name || deleteTarget?.code}</strong>
          {deleteTarget?.code ? <> (<code>{deleteTarget.code}</code>)</> : null} from <strong>{catalogTitle}</strong>.
        </p>
      </Modal>
    </div>
  );
}
