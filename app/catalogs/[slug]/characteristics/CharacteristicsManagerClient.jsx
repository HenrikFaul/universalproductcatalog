'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Modal from '../../../../components/ui/Modal';
import Card from '../../../../components/ui/Card';
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
  const storageKey = `upc-characteristics-${catalogSlug}`;
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setRows(parsed.map(normalizeDefinition));
        }
      }
    } catch (error) {
      console.error('Failed to hydrate characteristic manager state', error);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(rows));
    } catch (error) {
      console.error('Failed to persist characteristic manager state', error);
    }
  }, [rows, storageKey]);

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
      const haystack = [
        row.displayName,
        row.name,
        row.appliesTo,
        row.interpretation,
        row.allowedValues.join(', '),
      ]
        .join(' ')
        .toLowerCase();

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
    setDraft(
      draftFromDefinition(
        createEmptyDefinition(appliesToFilter !== 'all' ? appliesToFilter : productSpecifications[0]?.code || ''),
      ),
    );
    setEditorOpen(true);
  }

  function openEditModal(definition) {
    setEditorMode('edit');
    setDraftError('');
    setDraft(draftFromDefinition(definition));
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setDraftError('');
  }

  function handleDraftChange(field, value) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === 'displayName' && !current.name) {
        next.name = inferDefaultName(value);
      }
      return next;
    });
  }

  function validateDraft() {
    if (!String(draft.appliesTo || '').trim()) return 'Select the product / service / resource specification this characteristic belongs to.';
    if (!String(draft.displayName || '').trim()) return 'Display name is required.';
    if (!String(draft.name || '').trim()) return 'Internal characteristic name is required.';
    const min = Number(draft.minCardinality);
    const max = draft.maxCardinality === '' ? null : Number(draft.maxCardinality);
    if (Number.isFinite(min) && min < 0) return 'Minimum cardinality cannot be negative.';
    if (max !== null && Number.isFinite(max) && max < min) return 'Maximum cardinality cannot be smaller than minimum cardinality.';
    return '';
  }

  function handleSave() {
    const error = validateDraft();
    if (error) {
      setDraftError(error);
      return;
    }

    const normalized = normalizeDefinition(draft);

    setRows((current) => {
      if (editorMode === 'edit') {
        return current.map((item) => (item.id === normalized.id ? normalized : item));
      }
      return [normalized, ...current];
    });

    setEditorOpen(false);
    setDraftError('');
  }

  function openDeleteModal(definition) {
    setDeleteTarget(definition);
    setDeleteConfirmValue('');
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
    setDeleteConfirmValue('');
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setRows((current) => current.filter((item) => item.id !== deleteTarget.id));
    closeDeleteModal();
  }

  function handleResetToSeed() {
    setRows(seedDefinitions.map(normalizeDefinition));
  }

  return (
    <div className={styles.managerShell}>
      <section className={styles.metricsGrid} aria-label="Characteristic metrics">
        <Card title="Total characteristics" description="All loaded definitions" className={styles.metricCard}>
          <strong className={styles.metricValue}>{metrics.total}</strong>
        </Card>
        <Card title="Configurable" description="Editable during commercial flow" className={styles.metricCard}>
          <strong className={styles.metricValue}>{metrics.configurableCount}</strong>
        </Card>
        <Card title="Inventory impact" description="Relevant for PI / inventory sync" className={styles.metricCard}>
          <strong className={styles.metricValue}>{metrics.inventoryCount}</strong>
        </Card>
        <Card title="Fulfillment impact" description="Relevant for service activation / downstream orchestration" className={styles.metricCard}>
          <strong className={styles.metricValue}>{metrics.fulfillmentCount}</strong>
        </Card>
      </section>

      <div className={styles.workspaceGrid}>
        <Card
          title="Characteristic workspace"
          description="Search, filter and maintain universal EAV-style characteristic definitions."
          className={styles.primaryPanel}
          actions={(
            <div className={styles.toolbarActions}>
              <Button variant="ghost" onClick={() => exportJson(`${catalogSlug}-characteristics.json`, rows)}>Export JSON</Button>
              <Button variant="secondary" onClick={handleResetToSeed}>Reset to seed</Button>
              <Button onClick={openCreateModal}>New characteristic</Button>
            </div>
          )}
        >
          <div className={styles.toolbarGrid}>
            <Input
              label="Search"
              placeholder="Search name, applies-to, interpretation..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <label className={styles.selectField}>
              <span>Applies to</span>
              <select value={appliesToFilter} onChange={(event) => setAppliesToFilter(event.target.value)}>
                <option value="all">All structures</option>
                {appliesToOptions.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className={styles.selectField}>
              <span>Presence</span>
              <select value={presenceFilter} onChange={(event) => setPresenceFilter(event.target.value)}>
                <option value="all">All</option>
                {PRESENCE_TYPES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className={styles.selectField}>
              <span>Configurable</span>
              <select value={configFilter} onChange={(event) => setConfigFilter(event.target.value)}>
                <option value="all">All</option>
                <option value="configurable">Configurable only</option>
                <option value="non-configurable">Non-configurable only</option>
              </select>
            </label>
          </div>

          <div className={styles.tableShell}>
            <table className={styles.managerTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Applies to</th>
                  <th>Type</th>
                  <th>Presence</th>
                  <th>Cardinality</th>
                  <th>Configurable</th>
                  <th>Impacts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <strong>{row.displayName}</strong>
                        <span>{row.name}</span>
                      </div>
                    </td>
                    <td><code>{row.appliesTo}</code></td>
                    <td>{row.valueType}</td>
                    <td>{row.presence}</td>
                    <td>{row.minCardinality}..{row.maxCardinality ?? '∞'}</td>
                    <td>{row.configurable ? row.configurableStage : 'No'}</td>
                    <td>
                      <div className={styles.impactCell}>
                        <span className={styles.impactBadge}>INV {row.inventoryImpact}</span>
                        <span className={styles.impactBadge}>FUL {row.fulfillmentImpact}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Button variant="ghost" onClick={() => openEditModal(row)}>Edit</Button>
                        <Button variant="danger" onClick={() => openDeleteModal(row)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan="8" className={styles.emptyCell}>
                      No characteristics match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Design intent"
          description={`Safe CRUD shell for ${catalogTitle}. Keeps the backend untouched while the UX layer is rebuilt.`}
          className={styles.secondaryPanel}
        >
          <div className={styles.asideStack}>
            <div className={styles.asideSection}>
              <h3>What this step solves</h3>
              <ul className={styles.bulletList}>
                <li>Create new characteristic definitions from the UI</li>
                <li>Edit existing definitions without raw JSON editing</li>
                <li>Delete only through a confirmation modal</li>
                <li>Export the current blueprint as JSON for backend wiring</li>
              </ul>
            </div>
            <div className={styles.asideSection}>
              <h3>Safe deletion rule</h3>
              <p>
                The delete action requires confirmation and the row is only removed from the
                client blueprint state after explicit acknowledgement.
              </p>
            </div>
            <div className={styles.asideSection}>
              <h3>Next backend hook</h3>
              <p>
                This manager is designed so its save / delete handlers can later be replaced
                with TMF620-aligned API mutations without redesigning the screen.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={editorOpen}
        onClose={closeEditor}
        title={editorMode === 'edit' ? 'Edit characteristic' : 'Create characteristic'}
        description="Universal EAV definition editor with telecom demo defaults."
        footer={(
          <>
            <Button variant="ghost" onClick={closeEditor}>Cancel</Button>
            <Button onClick={handleSave}>{editorMode === 'edit' ? 'Save changes' : 'Create characteristic'}</Button>
          </>
        )}
      >
        <div className={styles.formGrid}>
          <label className={styles.selectField}>
            <span>Applies to</span>
            <select value={draft.appliesTo} onChange={(event) => handleDraftChange('appliesTo', event.target.value)}>
              <option value="">Select specification</option>
              {appliesToOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>
          </label>

          <Input
            label="Display name"
            value={draft.displayName}
            onChange={(event) => handleDraftChange('displayName', event.target.value)}
            placeholder="Customer segment"
          />
          <Input
            label="Internal name"
            value={draft.name}
            onChange={(event) => handleDraftChange('name', event.target.value)}
            placeholder="customerSegment"
          />

          <label className={styles.selectField}>
            <span>Value type</span>
            <select value={draft.valueType} onChange={(event) => handleDraftChange('valueType', event.target.value)}>
              {VALUE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className={styles.selectField}>
            <span>Presence</span>
            <select value={draft.presence} onChange={(event) => handleDraftChange('presence', event.target.value)}>
              {PRESENCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <Input
            label="Presence meaning"
            value={draft.presenceMeaning}
            onChange={(event) => handleDraftChange('presenceMeaning', event.target.value)}
            placeholder="Required before order submission"
          />

          <Input
            label="Minimum cardinality"
            type="number"
            value={draft.minCardinality}
            onChange={(event) => handleDraftChange('minCardinality', event.target.value)}
          />
          <Input
            label="Maximum cardinality"
            value={draft.maxCardinality}
            onChange={(event) => handleDraftChange('maxCardinality', event.target.value)}
            placeholder="Leave empty for unlimited"
          />

          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={draft.configurable}
              onChange={(event) => handleDraftChange('configurable', event.target.checked)}
            />
            <span>Configurable in commercial flow</span>
          </label>

          <label className={styles.selectField}>
            <span>Configurable stage</span>
            <select value={draft.configurableStage} onChange={(event) => handleDraftChange('configurableStage', event.target.value)}>
              {STAGE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className={styles.selectField}>
            <span>Editing behaviour</span>
            <select value={draft.editingBehaviour} onChange={(event) => handleDraftChange('editingBehaviour', event.target.value)}>
              {EDITING_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <Input
            label="Default value"
            value={draft.defaultValue}
            onChange={(event) => handleDraftChange('defaultValue', event.target.value)}
            placeholder="Optional default"
          />
          <Input
            label="Allowed values"
            value={draft.allowedValuesText}
            onChange={(event) => handleDraftChange('allowedValuesText', event.target.value)}
            placeholder="comma, separated, options"
            hint="For enum / array-like fields, separate items with commas."
          />

          <label className={styles.selectField}>
            <span>Inventory impact</span>
            <select value={draft.inventoryImpact} onChange={(event) => handleDraftChange('inventoryImpact', event.target.value)}>
              {IMPACT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className={styles.selectField}>
            <span>Fulfillment impact</span>
            <select value={draft.fulfillmentImpact} onChange={(event) => handleDraftChange('fulfillmentImpact', event.target.value)}>
              {IMPACT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <Input
            label="Interpretation"
            textarea
            value={draft.interpretation}
            onChange={(event) => handleDraftChange('interpretation', event.target.value)}
            placeholder="Explain how downstream PI / SI / orchestration should interpret this field."
          />
        </div>

        {draftError ? <p className={styles.errorText}>{draftError}</p> : null}
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={closeDeleteModal}
        title="Delete characteristic"
        description="This is intentionally guarded. Confirm the delete before the characteristic is removed from the blueprint."
        footer={(
          <>
            <Button variant="ghost" onClick={closeDeleteModal}>Cancel</Button>
            <Button
              variant="danger"
              disabled={!deleteTarget || deleteConfirmValue.trim() !== deleteTarget.displayName}
              onClick={handleDelete}
            >
              Delete permanently
            </Button>
          </>
        )}
      >
        {deleteTarget ? (
          <div className={styles.deleteBody}>
            <p>
              You are about to delete <strong>{deleteTarget.displayName}</strong> from{' '}
              <code>{deleteTarget.appliesTo}</code>.
            </p>
            <p className={styles.deleteHint}>
              Type the exact characteristic display name to enable deletion.
            </p>
            <Input
              label={`Type "${deleteTarget.displayName}" to confirm`}
              value={deleteConfirmValue}
              onChange={(event) => setDeleteConfirmValue(event.target.value)}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
