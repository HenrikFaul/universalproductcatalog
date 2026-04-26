'use client';

import { useMemo, useState } from 'react';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import Modal from '../../../../../components/ui/Modal';
import styles from './HierarchyBuilderClient.module.css';

function normalizeEdge(edge) {
  return {
    id: edge.id || `${edge.parent}-${edge.child}-${edge.lane || 'bundle'}`,
    parent: edge.parent,
    child: edge.child,
    min: Number.isFinite(Number(edge.min)) ? Number(edge.min) : 0,
    max: edge.max === null || edge.max === '' ? null : Number(edge.max),
    defaultQty: Number.isFinite(Number(edge.defaultQty)) ? Number(edge.defaultQty) : 0,
    lane: edge.lane || 'bundle',
  };
}

function buildNodeIndex(productSpecifications, serviceSpecifications, resourceSpecifications, characteristicDefinitions) {
  const characteristicCount = characteristicDefinitions.reduce((accumulator, item) => {
    const next = { ...accumulator };
    next[item.appliesTo] = (next[item.appliesTo] || 0) + 1;
    return next;
  }, {});

  return new Map([
    ...productSpecifications.map((item) => [item.code, {
      code: item.code,
      label: item.name,
      type: 'product',
      subtitle: item.category || 'Product specification',
      characteristicCount: characteristicCount[item.code] || 0,
    }]),
    ...serviceSpecifications.map((item) => [item.code, {
      code: item.code,
      label: item.name,
      type: 'service',
      subtitle: item.summary || 'Service specification',
      characteristicCount: characteristicCount[item.code] || 0,
    }]),
    ...resourceSpecifications.map((item) => [item.code, {
      code: item.code,
      label: item.name,
      type: 'resource',
      subtitle: item.summary || 'Resource specification',
      characteristicCount: characteristicCount[item.code] || 0,
    }]),
  ]);
}

export default function HierarchyBuilderClient({
  catalogSlug,
  catalogTitle,
  initialHierarchy,
  productSpecifications,
  serviceSpecifications,
  resourceSpecifications,
  serviceMapping,
  characteristicDefinitions,
}) {
  const nodeIndex = useMemo(
    () => buildNodeIndex(productSpecifications, serviceSpecifications, resourceSpecifications, characteristicDefinitions),
    [characteristicDefinitions, productSpecifications, resourceSpecifications, serviceSpecifications],
  );

  const serviceLaneEdges = useMemo(
    () => serviceMapping.flatMap((row) => [
      { parent: row.productSpec, child: row.serviceSpec, min: 1, max: 1, defaultQty: 1, lane: 'service' },
      ...(row.resourceSpecs || []).map((resourceCode) => ({ parent: row.serviceSpec, child: resourceCode, min: 0, max: 1, defaultQty: 0, lane: 'resource' })),
    ]),
    [serviceMapping],
  );

  const [edges, setEdges] = useState(() => [...initialHierarchy.map(normalizeEdge), ...serviceLaneEdges.map(normalizeEdge)]);
  const [laneFilter, setLaneFilter] = useState('all');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');
  const [draft, setDraft] = useState({ parent: productSpecifications[0]?.code || '', child: '', lane: 'bundle', min: 0, max: 1, defaultQty: 0 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const visibleEdges = useMemo(
    () => edges.filter((edge) => laneFilter === 'all' || edge.lane === laneFilter),
    [edges, laneFilter],
  );

  const selectedEdge = visibleEdges.find((item) => item.id === selectedEdgeId) || visibleEdges[0] || null;

  const productNodes = productSpecifications.map((item) => nodeIndex.get(item.code)).filter(Boolean);
  const serviceNodes = serviceSpecifications.map((item) => nodeIndex.get(item.code)).filter(Boolean);
  const resourceNodes = resourceSpecifications.map((item) => nodeIndex.get(item.code)).filter(Boolean);

  async function persist(nextEdges) {
    setSaving(true);
    setSaveError('');
    try {
      const bundleOnlyEdges = nextEdges.filter((item) => item.lane === 'bundle').map(({ id, ...rest }) => rest);
      const response = await fetch(`/api/catalogs/${catalogSlug}/hierarchy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: bundleOnlyEdges }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to persist the hierarchy graph.');
      }
      const persistedBundleEdges = (payload.items || []).map(normalizeEdge);
      const next = [...persistedBundleEdges, ...serviceLaneEdges.map(normalizeEdge)];
      setEdges(next);
      setSelectedEdgeId(next[0]?.id || '');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function addEdge() {
    if (!draft.parent || !draft.child) {
      setSaveError('Choose both a parent and a child node.');
      return;
    }
    const nextEdges = [
      ...edges,
      normalizeEdge({ ...draft, id: `${draft.parent}-${draft.child}-${draft.lane}` }),
    ];
    await persist(nextEdges);
  }

  async function removeEdge() {
    if (!deleteTarget) return;
    const nextEdges = edges.filter((item) => item.id !== deleteTarget.id);
    await persist(nextEdges);
    setDeleteTarget(null);
  }

  function resetToDefault() {
    void persist(initialHierarchy.map(normalizeEdge));
  }

  function renderNode(node) {
    if (!node) return null;
    return (
      <button
        key={node.code}
        type="button"
        className={styles.nodeCard}
        onClick={() => {
          const firstRelatedEdge = visibleEdges.find((edge) => edge.parent === node.code || edge.child === node.code);
          if (firstRelatedEdge) setSelectedEdgeId(firstRelatedEdge.id);
        }}
      >
        <span className={styles.nodeType}>{node.type}</span>
        <strong>{node.label}</strong>
        <code>{node.code}</code>
        <span className={styles.nodeMeta}>{node.subtitle}</span>
        <span className={styles.nodeMeta}>{node.characteristicCount} characteristic(s)</span>
      </button>
    );
  }

  return (
    <div className={styles.wrapper}>
      {saveError ? <p className="ds-field__error">{saveError}</p> : null}
      <div className={styles.metricsRow}>
        <Card title="Bundle edges" padding="md"><p className={styles.metricValue}>{edges.filter((item) => item.lane === 'bundle').length}</p></Card>
        <Card title="Service edges" padding="md"><p className={styles.metricValue}>{edges.filter((item) => item.lane === 'service').length}</p></Card>
        <Card title="Resource edges" padding="md"><p className={styles.metricValue}>{edges.filter((item) => item.lane === 'resource').length}</p></Card>
      </div>

      <div className={styles.mainGrid}>
        <Card
          title="Hierarchy canvas"
          description={`Current catalog: ${catalogTitle}. The bundle lane is editable; service and resource decomposition are shown from service mappings.`}
          actions={(
            <div className={styles.actionRow}>
              <label className={styles.filterField}><span>Lane</span><select value={laneFilter} onChange={(event) => setLaneFilter(event.target.value)}><option value="all">All lanes</option><option value="bundle">Bundle structure</option><option value="service">Product → Service</option><option value="resource">Service → Resource</option></select></label>
              <Button variant="secondary" onClick={resetToDefault} loading={saving}>Reset bundle lane</Button>
            </div>
          )}
        >
          <div className={styles.laneGrid}>
            <section className={styles.laneColumn}>
              <h3>Products</h3>
              <div className={styles.nodeList}>{productNodes.map(renderNode)}</div>
            </section>
            <section className={styles.edgeColumn}>
              <h3>Edges</h3>
              <div className={styles.edgeList}>
                {visibleEdges.map((edge) => (
                  <button
                    type="button"
                    key={edge.id}
                    className={`${styles.edgeRow} ${selectedEdge?.id === edge.id ? styles.edgeRowActive : ''}`}
                    onClick={() => setSelectedEdgeId(edge.id)}
                  >
                    <span className={styles.edgeLane}>{edge.lane}</span>
                    <span><code>{edge.parent}</code> → <code>{edge.child}</code></span>
                  </button>
                ))}
              </div>
            </section>
            <section className={styles.laneColumn}>
              <h3>Services & resources</h3>
              <div className={styles.nodeList}>{serviceNodes.map(renderNode)}{resourceNodes.map(renderNode)}</div>
            </section>
          </div>
        </Card>

        <div className={styles.sideRail}>
          <Card title="Selected relationship" description="Inspect the currently selected edge and remove only editable bundle relationships.">
            {selectedEdge ? (
              <div className={styles.inspectorStack}>
                <div><strong>Parent</strong><div><code>{selectedEdge.parent}</code></div></div>
                <div><strong>Child</strong><div><code>{selectedEdge.child}</code></div></div>
                <div><strong>Lane</strong><div>{selectedEdge.lane}</div></div>
                <div><strong>Cardinality</strong><div>{selectedEdge.min}..{selectedEdge.max ?? '∞'}</div></div>
                <div><strong>Default quantity</strong><div>{selectedEdge.defaultQty}</div></div>
                {selectedEdge.lane === 'bundle' ? (
                  <Button variant="danger" onClick={() => setDeleteTarget(selectedEdge)}>Delete edge</Button>
                ) : (
                  <p className={styles.mutedText}>Service/resource edges are read-only because they come from the service mapping layer.</p>
                )}
              </div>
            ) : <p className={styles.mutedText}>Select an edge to inspect it.</p>}
          </Card>

          <Card title="Add bundle relationship" description="Create a new Bundle → Child relationship between product specifications.">
            <div className={styles.formStack}>
              <label className={styles.filterField}><span>Parent product</span><select value={draft.parent} onChange={(event) => setDraft((prev) => ({ ...prev, parent: event.target.value }))}>{productSpecifications.map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}</select></label>
              <label className={styles.filterField}><span>Child product</span><select value={draft.child} onChange={(event) => setDraft((prev) => ({ ...prev, child: event.target.value }))}><option value="">Select child…</option>{productSpecifications.map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}</select></label>
              <div className={styles.compactGrid}>
                <Input label="Min" type="number" value={draft.min} onChange={(event) => setDraft((prev) => ({ ...prev, min: event.target.value }))} />
                <Input label="Max" type="number" value={draft.max} onChange={(event) => setDraft((prev) => ({ ...prev, max: event.target.value }))} />
                <Input label="Default qty" type="number" value={draft.defaultQty} onChange={(event) => setDraft((prev) => ({ ...prev, defaultQty: event.target.value }))} />
              </div>
              <Button onClick={addEdge} loading={saving}>Add bundle edge</Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete hierarchy edge"
        description="This removes the selected bundle relationship from the persisted catalog graph."
        actions={(
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={removeEdge} loading={saving}>Delete edge</Button>
          </>
        )}
      >
        {deleteTarget ? (
          <p>
            Remove <code>{deleteTarget.parent}</code> → <code>{deleteTarget.child}</code> from <strong>{catalogTitle}</strong>?
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
