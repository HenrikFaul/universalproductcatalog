'use client';

import { useMemo, useState } from 'react';
import Button from '../../../../../components/ui/Button';
import Input from '../../../../../components/ui/Input';
import Modal from '../../../../../components/ui/Modal';
import Card from '../../../../../components/ui/Card';
import styles from './CharacteristicsManagerClient.module.css';

const VALUE_TYPES = ['string', 'number', 'boolean', 'json', 'enum', 'array'];
const PRESENCE_TYPES = [
  'optional',
  'mandatoryForOrderFinalization',
  'mandatoryForFulfillment',
  'mandatoryForSale',
  'derived',
];
const STAGE_TYPES = ['quotation', 'sale', 'acceptance', 'fulfillment', 'inventory', 'lifecycle'];
const EDITING_TYPES = ['editable', 'readonly', 'derived', 'system'];
const IMPACT_TYPES = ['Y', 'N', 'Derived'];

function safeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferDefaultName(label) {
  const slug = safeSlug(label);
  return slug.replace(/-([a-z])/g, (_, chr) => chr.toUpperCase());
}

function createEmptyDefinition(defaultAppliesTo = '') {
  return {
    id: '',
    appliesTo: defaultAppliesTo,
    displayName: '',
    name: '',
    valueType: 'string',
    presence: 'optional',
    presenceMeaning: '',
    minCardinality: 0,
    maxCardinality: 1,
    configurable: true,
    configurableStage: 'quotation',
    editingBehaviour: 'editable',
    defaultValue: '',
    allowedValues: [],
    inventoryImpact: 'N',
    fulfillmentImpact: 'N',
    interpretation: '',
  };
}

function normalizeDefinition(input) {
  const displayName = String(input.displayName || input.name || '').trim();
  const allowedValues = Array.isArray(input.allowedValues)
    ? input.allowedValues.map((item) => String(item).trim()).filter(Boolean)
    : String(input.allowedValuesText || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  return {
    ...input,
    id: input.id || `${safeSlug(input.appliesTo)}-${safeSlug(displayName || input.name)}-${Math.random().toString(36).slice(2, 8)}`,
    displayName,
    name: String(input.name || inferDefaultName(displayName)).trim(),
    appliesTo: String(input.appliesTo || '').trim(),
    valueType: String(input.valueType || 'string'),
    presence: String(input.presence || 'optional'),
    presenceMeaning: String(input.presenceMeaning || '').trim(),
    minCardinality: Number.isFinite(Number(input.minCardinality)) ? Number(input.minCardinality) : 0,
    maxCardinality:
      input.maxCardinality === null || input.maxCardinality === '' || String(input.maxCardinality).toLowerCase() === '∞'
        ? null
        : Number.isFinite(Number(input.maxCardinality))
          ? Number(input.maxCardinality)
          : 1,
    configurable: Boolean(input.configurable),
    configurableStage: String(input.configurableStage || 'quotation'),
    editingBehaviour: String(input.editingBehaviour || 'editable'),
    defaultValue: input.defaultValue === null || input.defaultValue === undefined ? '' : input.defaultValue,
    allowedValues,
    inventoryImpact: String(input.inventoryImpact || 'N'),
    fulfillmentImpact: String(input.fulfillmentImpact || 'N'),
    interpretation: String(input.interpretation || '').trim(),
  };
}

function draftFromDefinition(definition) {
  return {
    ...definition,
    minCardinality: definition.minCardinality ?? 0,
    maxCardinality: definition.maxCardinality ?? '',
    defaultValue: definition.defaultValue ?? '',
    allowedValuesText: Array.isArray(definition.allowedValues) ? definition.allowedValues.join(', ') : '',
  };
}

function exportJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CharacteristicsManagerClient({
  catalogSlug,
  catalogTitle,
  seedDefinitions,
  productSpecifications,
  serviceSpecifications,
  resourceSpecifications,
}) {
  const specOptions = useMemo(
    () => [
      ...productSpecifications.map((item) => ({ code: item.code, label: `${item.code} · ${item.name}` })),
      ...serviceSpecifications.map((item) => ({ code: item.code, label: `${item.code} · ${item.name}` })),
      ...resourceSpecifications.map((item) => ({ code: item.code, label: `${item.code} · ${item.name}` })),
    ],
    [productSpecifications, resourceSpecifications, serviceSpecifications],
  );

  const [rows, setRows] = useState(() => seedDefinitions.map(normalizeDefinition));
  const [search, setSearch] = useState('');
  const [appliesToFilter, setAppliesToFilter] = useState('all');
  const [presenceFilter, setPresenceFilter] = useState('all');
  const [configFilter, setConfigFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [draft, setDraft] = useState(() => draftFromDefinition(createEmptyDefinition(seedDefinitions[0]?.appliesTo || productSpecifications[0]?.code || '')));
  const [draftError, setDraftError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');

  const metrics = useMemo(() => {
    const configurableCount = rows.filter((item) => item.configurable).length;
    const inventoryCount = rows.filter((item) => item.inventoryImpact === 'Y').length;
    const fulfillmentCount = rows.filter((item) => item.fulfillmentImpact === 'Y').length;
    return {
      total: rows.length,
      configurableCount,
      inventoryCount,
      fulfillmentCount,
    };
  }, [rows]);

  const appliesToOptions = useMemo(() => {
    const optionMap = new Map();
    for (const item of specOptions) optionMap.set(item.code, item.label);
    return Array.from(optionMap.entries()).map(([code, label]) => ({ code, label }));
  }, [specOptions]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const haystack = [row.displayName, row.name, row.appliesTo, row.interpretation, row.allowedValues.join(', ')].join(' ').toLowerCase();
      if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;
      if (appliesToFilter !== 'all' && row.appliesTo !== appliesToFilter) return false;
      if (presenceFilter !== 'all' && row.presence !== presenceFilter) return false;
      if (configFilter === 'configurable' && !row.configurable) return false;
      if (configFilter === 'non-configurable' && row.configurable) return false;
      return true;
    });
  }, [appliesToFilter, configFilter, presenceFilter, rows, search]);

  function openCreateModal() {
    setEditorMode('create');
    setDraftError('');
    setDraft(draftFromDefinition(createEmptyDefinition(appliesToFilter !== 'all' ? appliesToFilter : productSpecifications[0]?.code || '')));
    setEditorOpen(true);
  }

  function openEditModal(definition) {
    setEditorMode('edit');
    setDraftError('');
    setDraft(draftFromDefinition(definition));
    setEditorOpen(true);
  }

  async function persistRows(nextRows) {
    setSaving(true);
    setSaveError('');
    try {
      const response = await fetch(`/api/catalogs/${catalogSlug}/characteristics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: nextRows }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to persist characteristic definitions.');
      }
      setRows((payload.items || []).map(normalizeDefinition));
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    const normalized = normalizeDefinition(draft);
    if (!normalized.appliesTo) {
      setDraftError('Choose which product, service or resource specification the characteristic applies to.');
      return;
    }
    if (!normalized.displayName) {
      setDraftError('Display name is required.');
      return;
    }
    if (!normalized.name) {
      setDraftError('Technical name is required.');
      return;
    }

    const nextRows = editorMode === 'create'
      ? [...rows, normalized]
      : rows.map((item) => (item.id === normalized.id ? normalized : item));

    const success = await persistRows(nextRows);
    if (success) {
      setEditorOpen(false);
    }
  }

  function requestDelete(definition) {
    setDeleteTarget(definition);
    setDeleteConfirmValue('');
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteConfirmValue.trim() !== deleteTarget.displayName) return;
    const nextRows = rows.filter((item) => item.id !== deleteTarget.id);
    const success = await persistRows(nextRows);
    if (success) {
      setDeleteTarget(null);
      setDeleteConfirmValue('');
    }
  }

  function resetToSeed() {
    void persistRows(seedDefinitions.map(normalizeDefinition));
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.metricsGrid}>
        <Card title="Total definitions" padding="md"><p className={styles.metricValue}>{metrics.total}</p></Card>
        <Card title="Configurable" padding="md"><p className={styles.metricValue}>{metrics.configurableCount}</p></Card>
        <Card title="Inventory-impacting" padding="md"><p className={styles.metricValue}>{metrics.inventoryCount}</p></Card>
        <Card title="Fulfillment-impacting" padding="md"><p className={styles.metricValue}>{metrics.fulfillmentCount}</p></Card>
      </div>

      <Card
        title="Filter and manage characteristics"
        description={`Current catalog: ${catalogTitle}. Changes are saved to Supabase if server-side credentials are configured.`}
        actions={(
          <div className={styles.actionRow}>
            <Button variant="secondary" onClick={() => exportJson(`${catalogSlug}-characteristics.json`, rows)}>Export JSON</Button>
            <Button variant="ghost" onClick={resetToSeed} loading={saving}>Reset to seed</Button>
            <Button onClick={openCreateModal}>New characteristic</Button>
          </div>
        )}
      >
        {saveError ? <p className="ds-field__error">{saveError}</p> : null}
        <div className={styles.filtersGrid}>
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, interpretation, applies-to or values" />
          <label className={styles.filterField}><span>Applies to</span><select value={appliesToFilter} onChange={(event) => setAppliesToFilter(event.target.value)}><option value="all">All</option>{appliesToOptions.map((item) => <option value={item.code} key={item.code}>{item.label}</option>)}</select></label>
          <label className={styles.filterField}><span>Presence</span><select value={presenceFilter} onChange={(event) => setPresenceFilter(event.target.value)}><option value="all">All</option>{PRESENCE_TYPES.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
          <label className={styles.filterField}><span>Configurability</span><select value={configFilter} onChange={(event) => setConfigFilter(event.target.value)}><option value="all">All</option><option value="configurable">Configurable only</option><option value="non-configurable">Non-configurable only</option></select></label>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Display name</th><th>Applies to</th><th>Type</th><th>Presence</th><th>Cardinality</th><th>Configurable</th><th>Allowed values</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.displayName}</strong>
                    <span className={styles.subtleLine}>{row.name}</span>
                  </td>
                  <td><code>{row.appliesTo}</code></td>
                  <td>{row.valueType}</td>
                  <td>{row.presence}</td>
                  <td>{row.minCardinality}..{row.maxCardinality ?? '∞'}</td>
                  <td>{row.configurable ? 'Yes' : 'No'}</td>
                  <td>{row.allowedValues.length ? row.allowedValues.join(', ') : '—'}</td>
                  <td>
                    <div className={styles.inlineActions}>
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(row)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => requestDelete(row)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editorMode === 'create' ? 'Create characteristic' : 'Edit characteristic'}
        description="Define universal characteristic metadata that can later be mapped into industry-specific product structures."
        actions={(
          <>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDraft} loading={saving}>{editorMode === 'create' ? 'Create' : 'Save changes'}</Button>
          </>
        )}
      >
        <div className={styles.modalForm}>
          <label className={styles.filterField}><span>Applies to</span><select value={draft.appliesTo} onChange={(event) => setDraft((prev) => ({ ...prev, appliesTo: event.target.value }))}><option value="">Select…</option>{appliesToOptions.map((item) => <option value={item.code} key={item.code}>{item.label}</option>)}</select></label>
          <div className={styles.modalGrid}>
            <Input label="Display name" value={draft.displayName} onChange={(event) => setDraft((prev) => ({ ...prev, displayName: event.target.value }))} />
            <Input label="Technical name" value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
            <label className={styles.filterField}><span>Value type</span><select value={draft.valueType} onChange={(event) => setDraft((prev) => ({ ...prev, valueType: event.target.value }))}>{VALUE_TYPES.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label className={styles.filterField}><span>Presence</span><select value={draft.presence} onChange={(event) => setDraft((prev) => ({ ...prev, presence: event.target.value }))}>{PRESENCE_TYPES.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <Input label="Presence meaning" value={draft.presenceMeaning} onChange={(event) => setDraft((prev) => ({ ...prev, presenceMeaning: event.target.value }))} />
            <label className={styles.filterField}><span>Configurable stage</span><select value={draft.configurableStage} onChange={(event) => setDraft((prev) => ({ ...prev, configurableStage: event.target.value }))}>{STAGE_TYPES.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label className={styles.filterField}><span>Editing behaviour</span><select value={draft.editingBehaviour} onChange={(event) => setDraft((prev) => ({ ...prev, editingBehaviour: event.target.value }))}>{EDITING_TYPES.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label className={styles.filterField}><span>Inventory impact</span><select value={draft.inventoryImpact} onChange={(event) => setDraft((prev) => ({ ...prev, inventoryImpact: event.target.value }))}>{IMPACT_TYPES.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label className={styles.filterField}><span>Fulfillment impact</span><select value={draft.fulfillmentImpact} onChange={(event) => setDraft((prev) => ({ ...prev, fulfillmentImpact: event.target.value }))}>{IMPACT_TYPES.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <Input label="Min cardinality" type="number" value={draft.minCardinality} onChange={(event) => setDraft((prev) => ({ ...prev, minCardinality: event.target.value }))} />
            <Input label="Max cardinality" value={draft.maxCardinality} onChange={(event) => setDraft((prev) => ({ ...prev, maxCardinality: event.target.value }))} description="Use ∞ or leave empty for open-ended cardinality." />
            <Input label="Default value" value={draft.defaultValue} onChange={(event) => setDraft((prev) => ({ ...prev, defaultValue: event.target.value }))} />
            <Input label="Allowed values (comma-separated)" value={draft.allowedValuesText} onChange={(event) => setDraft((prev) => ({ ...prev, allowedValuesText: event.target.value }))} />
          </div>
          <Input multiline label="Interpretation" value={draft.interpretation} onChange={(event) => setDraft((prev) => ({ ...prev, interpretation: event.target.value }))} />
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={Boolean(draft.configurable)} onChange={(event) => setDraft((prev) => ({ ...prev, configurable: event.target.checked }))} />
            <span>Configurable by the user or CPQ flow</span>
          </label>
          {draftError ? <p className="ds-field__error">{draftError}</p> : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete characteristic"
        description="Type the exact display name to confirm permanent removal from the persisted catalog structure."
        actions={(
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={!deleteTarget || deleteConfirmValue.trim() !== deleteTarget.displayName} loading={saving}>Delete</Button>
          </>
        )}
      >
        {deleteTarget ? (
          <div className={styles.deleteBody}>
            <p>
              You are deleting <strong>{deleteTarget.displayName}</strong> from <strong>{catalogTitle}</strong>.
            </p>
            <Input
              label={`Type “${deleteTarget.displayName}” to confirm`}
              value={deleteConfirmValue}
              onChange={(event) => setDeleteConfirmValue(event.target.value)}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
