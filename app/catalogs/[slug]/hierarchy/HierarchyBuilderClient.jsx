'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import Input from '../../../../../components/ui/Input';
import Modal from '../../../../../components/ui/Modal';
import styles from './HierarchyBuilderClient.module.css';

const VIEW_ALL = 'all';

function clampNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildStorageKey(slug) {
  return `upc:catalog:${slug}:hierarchy-v1`;
}

function enrichNodes(nodes, edges, offeringMap, characteristicCounts) {
  const incoming = new Map();
  const outgoing = new Map();

  for (const edge of edges) {
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    incoming.get(edge.target).push(edge);
    outgoing.get(edge.source).push(edge);
  }

  return nodes.map((node) => ({
    ...node,
    incomingCount: (incoming.get(node.id) || []).length,
    outgoingCount: (outgoing.get(node.id) || []).length,
    offeringCount: (offeringMap[node.code] || []).length,
    characteristicCount: characteristicCounts[node.code] || 0,
  }));
}

function computeDepths(nodes, edges) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const incomingCount = {};
  const outgoing = {};

  for (const id of nodeIds) {
    incomingCount[id] = 0;
    outgoing[id] = [];
  }

  for (const edge of edges) {
    if (!(edge.source in outgoing) || !(edge.target in incomingCount)) continue;
    outgoing[edge.source].push(edge.target);
    incomingCount[edge.target] += 1;
  }

  const queue = Object.keys(incomingCount).filter((id) => incomingCount[id] === 0);
  const depth = {};
  for (const id of queue) depth[id] = 0;

  while (queue.length) {
    const current = queue.shift();
    const nextNodes = outgoing[current] || [];
    for (const next of nextNodes) {
      depth[next] = Math.max(depth[next] ?? 0, (depth[current] ?? 0) + 1);
      incomingCount[next] -= 1;
      if (incomingCount[next] === 0) queue.push(next);
    }
  }

  return depth;
}

function formatLane(edge) {
  if (edge.lane === 'product') return 'Bundle structure';
  if (edge.lane === 'decomposition') return 'Service decomposition';
  return edge.lane;
}

export default function HierarchyBuilderClient({
  catalogSlug,
  catalogTitle,
  nodes,
  edges,
  offeringMap,
  characteristicCounts,
}) {
  const storageKey = useMemo(() => buildStorageKey(catalogSlug), [catalogSlug]);
  const [draftEdges, setDraftEdges] = useState(edges);
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id ?? null);
  const [viewLane, setViewLane] = useState(VIEW_ALL);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [relationDraft, setRelationDraft] = useState({
    source: nodes[0]?.id ?? '',
    target: nodes[1]?.id ?? '',
    relationType: 'Product component',
    lane: 'product',
    min: 0,
    max: 1,
    defaultQty: 0,
  });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.edges) && parsed.edges.length) {
        setDraftEdges(parsed.edges);
      }
    } catch {
      // ignore corrupted local draft
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ edges: draftEdges }));
  }, [draftEdges, storageKey]);

  const enrichedNodes = useMemo(
    () => enrichNodes(nodes, draftEdges, offeringMap, characteristicCounts),
    [nodes, draftEdges, offeringMap, characteristicCounts],
  );

  const filteredEdges = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return draftEdges.filter((edge) => {
      if (viewLane !== VIEW_ALL && edge.lane !== viewLane) return false;
      if (!normalizedSearch) return true;
      return [edge.source, edge.target, edge.relationType].some((value) =>
        String(value).toLowerCase().includes(normalizedSearch),
      );
    });
  }, [draftEdges, search, viewLane]);

  const visibleNodeIds = useMemo(() => {
    const ids = new Set();
    for (const edge of filteredEdges) {
      ids.add(edge.source);
      ids.add(edge.target);
    }
    if (!filteredEdges.length) {
      for (const node of enrichedNodes) ids.add(node.id);
    }
    return ids;
  }, [filteredEdges, enrichedNodes]);

  const visibleNodes = useMemo(
    () => enrichedNodes.filter((node) => visibleNodeIds.has(node.id)),
    [enrichedNodes, visibleNodeIds],
  );

  const depths = useMemo(() => computeDepths(visibleNodes, filteredEdges), [visibleNodes, filteredEdges]);

  const columns = useMemo(() => {
    const buckets = new Map();
    for (const node of visibleNodes) {
      const depth = depths[node.id] ?? 0;
      const list = buckets.get(depth) ?? [];
      list.push(node);
      buckets.set(depth, list);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([depth, list]) => ({
        depth,
        title: depth === 0 ? 'Entry layer' : `Level ${depth}`,
        nodes: list.sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [visibleNodes, depths]);

  const selectedNode = enrichedNodes.find((node) => node.id === selectedNodeId) ?? enrichedNodes[0] ?? null;

  const selectedIncoming = useMemo(
    () => draftEdges.filter((edge) => edge.target === selectedNode?.id),
    [draftEdges, selectedNode],
  );
  const selectedOutgoing = useMemo(
    () => draftEdges.filter((edge) => edge.source === selectedNode?.id),
    [draftEdges, selectedNode],
  );

  const allNodeOptions = enrichedNodes.map((node) => ({
    value: node.id,
    label: `${node.label} (${node.code})`,
  }));

  function handleReset() {
    setDraftEdges(edges);
    window.localStorage.removeItem(storageKey);
  }

  function handleCreateRelation(event) {
    event.preventDefault();
    if (!relationDraft.source || !relationDraft.target || relationDraft.source === relationDraft.target) return;

    const newEdge = {
      id: `custom:${relationDraft.source}:${relationDraft.target}:${Date.now()}`,
      source: relationDraft.source,
      target: relationDraft.target,
      relationType: relationDraft.relationType,
      lane: relationDraft.lane,
      min: clampNumber(relationDraft.min, 0),
      max: relationDraft.max === '' ? null : clampNumber(relationDraft.max, 1),
      defaultQty: clampNumber(relationDraft.defaultQty, 0),
    };

    setDraftEdges((current) => [newEdge, ...current]);
  }

  function handleDeleteRelation() {
    if (!deleteTarget) return;
    setDraftEdges((current) => current.filter((edge) => edge.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <section className={styles.shell}>
      <div className={styles.topRow}>
        <Card
          title="Hierarchy control"
          description="Choose which structure lane to inspect, filter the canvas and open the current node in the inspector."
          className={styles.controlCard}
          actions={<Button variant="ghost" onClick={handleReset}>Reset draft</Button>}
        >
          <div className={styles.controlsGrid}>
            <Input
              label="Search hierarchy"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="PS_WIRED_INTERNET / RS_ONT / Product → Service"
            />

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Lane</span>
              <select className={styles.select} value={viewLane} onChange={(event) => setViewLane(event.target.value)}>
                <option value="all">All relations</option>
                <option value="product">Bundle structure</option>
                <option value="decomposition">Service decomposition</option>
              </select>
            </label>
          </div>
        </Card>

        <Card
          title="Live structure stats"
          description={`${catalogTitle} visual hierarchy overview.`}
          className={styles.metricsCard}
        >
          <div className={styles.metricsGrid}>
            <div className={styles.metric}><strong>{enrichedNodes.length}</strong><span>Nodes</span></div>
            <div className={styles.metric}><strong>{draftEdges.length}</strong><span>Relations</span></div>
            <div className={styles.metric}><strong>{draftEdges.filter((edge) => edge.lane === 'product').length}</strong><span>Bundle links</span></div>
            <div className={styles.metric}><strong>{draftEdges.filter((edge) => edge.lane === 'decomposition').length}</strong><span>Decomposition links</span></div>
          </div>
        </Card>
      </div>

      <div className={styles.workspace}>
        <Card title="Structure canvas" description="Node-based, depth-grouped visual structure for TMF620-style bundle and decomposition modeling." className={styles.canvasCard}>
          <div className={styles.canvasLegend}>
            <span className={`${styles.legendPill} ${styles.product}`}>Product specification</span>
            <span className={`${styles.legendPill} ${styles.service}`}>Service specification</span>
            <span className={`${styles.legendPill} ${styles.resource}`}>Resource specification</span>
          </div>

          <div className={styles.canvasScroller}>
            <div className={styles.canvasColumns}>
              {columns.map((column) => (
                <section className={styles.canvasColumn} key={column.depth}>
                  <header className={styles.columnHeader}>{column.title}</header>
                  <div className={styles.nodeStack}>
                    {column.nodes.map((node) => (
                      <button
                        type="button"
                        key={node.id}
                        className={`${styles.nodeCard} ${styles[node.kind.replace(/-/g, '')] || ''} ${selectedNodeId === node.id ? styles.nodeCardActive : ''}`}
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        <div className={styles.nodeTopline}>
                          <span className={styles.nodeKind}>{node.group}</span>
                          <span className={styles.nodeStatus}>{node.status}</span>
                        </div>
                        <strong className={styles.nodeTitle}>{node.label}</strong>
                        <code className={styles.nodeCode}>{node.code}</code>
                        <p className={styles.nodeSummary}>{node.summary}</p>
                        <div className={styles.nodeMetaRow}>
                          <span>{node.offeringCount} offerings</span>
                          <span>{node.characteristicCount} chars</span>
                          <span>{node.outgoingCount} out</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </Card>

        <aside className={styles.sidebar}>
          <Card
            title="Selected node"
            description={selectedNode ? `${selectedNode.label} details and connected relations.` : 'Choose a node from the canvas.'}
            className={styles.sidebarCard}
          >
            {selectedNode ? (
              <div className={styles.inspectorStack}>
                <div className={styles.inspectorHero}>
                  <div>
                    <div className={styles.inspectorKind}>{selectedNode.group}</div>
                    <h3 className={styles.inspectorTitle}>{selectedNode.label}</h3>
                    <code className={styles.nodeCode}>{selectedNode.code}</code>
                  </div>
                  <span className={styles.nodeStatus}>{selectedNode.status}</span>
                </div>

                <dl className={styles.detailList}>
                  <div><dt>Summary</dt><dd>{selectedNode.summary}</dd></div>
                  <div><dt>Meta</dt><dd>{selectedNode.meta}</dd></div>
                  <div><dt>Offerings</dt><dd>{selectedNode.offeringCount}</dd></div>
                  <div><dt>Characteristics</dt><dd>{selectedNode.characteristicCount}</dd></div>
                </dl>

                {(offeringMap[selectedNode.code] || []).length ? (
                  <div className={styles.inlineSection}>
                    <h4 className={styles.subheading}>Offerings on this spec</h4>
                    <div className={styles.pillWrap}>
                      {offeringMap[selectedNode.code].map((offering) => (
                        <span className={styles.tokenPill} key={offering.code}>{offering.name}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className={styles.inlineSection}>
                  <h4 className={styles.subheading}>Outgoing relations</h4>
                  <div className={styles.edgeStack}>
                    {selectedOutgoing.length ? selectedOutgoing.map((edge) => (
                      <div className={styles.edgeRow} key={edge.id}>
                        <div>
                          <div className={styles.edgeTitle}>{edge.target}</div>
                          <div className={styles.edgeMeta}>{edge.relationType} · {formatLane(edge)}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(edge)}>Delete</Button>
                      </div>
                    )) : <p className={styles.emptyText}>No outgoing relations.</p>}
                  </div>
                </div>

                <div className={styles.inlineSection}>
                  <h4 className={styles.subheading}>Incoming relations</h4>
                  <div className={styles.edgeStack}>
                    {selectedIncoming.length ? selectedIncoming.map((edge) => (
                      <div className={styles.edgeRowMuted} key={edge.id}>
                        <div className={styles.edgeTitle}>{edge.source}</div>
                        <div className={styles.edgeMeta}>{edge.relationType} · {formatLane(edge)}</div>
                      </div>
                    )) : <p className={styles.emptyText}>No incoming relations.</p>}
                  </div>
                </div>
              </div>
            ) : null}
          </Card>

          <Card title="Create relation" description="Add a new bundle or decomposition relation without breaking the current static demo data." className={styles.sidebarCard}>
            <form className={styles.formStack} onSubmit={handleCreateRelation}>
              <label className={styles.filterField}>
                <span className={styles.filterLabel}>Source node</span>
                <select className={styles.select} value={relationDraft.source} onChange={(event) => setRelationDraft((current) => ({ ...current, source: event.target.value }))}>
                  {allNodeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className={styles.filterField}>
                <span className={styles.filterLabel}>Target node</span>
                <select className={styles.select} value={relationDraft.target} onChange={(event) => setRelationDraft((current) => ({ ...current, target: event.target.value }))}>
                  {allNodeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <Input label="Relation label" value={relationDraft.relationType} onChange={(event) => setRelationDraft((current) => ({ ...current, relationType: event.target.value }))} />

              <div className={styles.dualGrid}>
                <label className={styles.filterField}>
                  <span className={styles.filterLabel}>Lane</span>
                  <select className={styles.select} value={relationDraft.lane} onChange={(event) => setRelationDraft((current) => ({ ...current, lane: event.target.value }))}>
                    <option value="product">Bundle structure</option>
                    <option value="decomposition">Service decomposition</option>
                  </select>
                </label>
                <Input label="Default qty" type="number" min="0" value={relationDraft.defaultQty} onChange={(event) => setRelationDraft((current) => ({ ...current, defaultQty: event.target.value }))} />
              </div>

              <div className={styles.dualGrid}>
                <Input label="Min" type="number" min="0" value={relationDraft.min} onChange={(event) => setRelationDraft((current) => ({ ...current, min: event.target.value }))} />
                <Input label="Max" type="number" min="0" value={relationDraft.max} onChange={(event) => setRelationDraft((current) => ({ ...current, max: event.target.value }))} />
              </div>

              <Button type="submit">Add relation</Button>
            </form>
          </Card>
        </aside>
      </div>

      <Card title="Relation register" description="Auditable relation list with bundle cardinalities and decomposition links." className={styles.registryCard}>
        <div className={styles.registryScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Source</th>
                <th>Target</th>
                <th>Type</th>
                <th>Lane</th>
                <th>Cardinality</th>
                <th>Default qty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredEdges.map((edge) => (
                <tr key={edge.id}>
                  <td><code>{edge.source}</code></td>
                  <td><code>{edge.target}</code></td>
                  <td>{edge.relationType}</td>
                  <td>{formatLane(edge)}</td>
                  <td>{edge.min ?? 0}..{edge.max ?? '∞'}</td>
                  <td>{edge.defaultQty ?? 0}</td>
                  <td><Button variant="ghost" size="sm" onClick={() => setDeleteTarget(edge)}>Delete</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete hierarchy relation"
        description="This removes the selected relation from the current draft canvas. Static seed data remains untouched and can be restored with Reset draft."
        actions={(
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteRelation}>Delete relation</Button>
          </>
        )}
      >
        {deleteTarget ? (
          <div className={styles.confirmBody}>
            <div><strong>Source:</strong> <code>{deleteTarget.source}</code></div>
            <div><strong>Target:</strong> <code>{deleteTarget.target}</code></div>
            <div><strong>Type:</strong> {deleteTarget.relationType}</div>
            <div><strong>Lane:</strong> {formatLane(deleteTarget)}</div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
