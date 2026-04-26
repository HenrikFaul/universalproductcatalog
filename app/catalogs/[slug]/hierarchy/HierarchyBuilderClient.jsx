'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Modal from '../../../../components/ui/Modal';
import Tabs from '../../../../components/ui/Tabs';
import styles from './HierarchyBuilderClient.module.css';

const PRODUCT_NODE_WIDTH = 232;
const PRODUCT_NODE_HEIGHT = 124;
const PRODUCT_NODE_GAP_X = 104;
const PRODUCT_NODE_GAP_Y = 44;
const PRODUCT_ROOT_X = 72;
const PRODUCT_ROOT_Y = 72;
const SERVICE_NODE_WIDTH = 232;
const SERVICE_NODE_HEIGHT = 112;
const SERVICE_COLUMN_X = 720;
const RESOURCE_COLUMN_X = 1016;
const SERVICE_ROOT_Y = 96;
const SERVICE_GAP_Y = 28;
const CANVAS_WIDTH = 1320;
const CANVAS_HEIGHT = 920;
const CANVAS_PADDING = 48;

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

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

function buildCharacteristicStats(characteristicDefinitions) {
  return characteristicDefinitions.reduce((accumulator, item) => {
    const current = accumulator[item.appliesTo] || {
      items: [],
      requiredCount: 0,
      configurableCount: 0,
    };

    current.items.push(item);
    if (String(item.presence || '').toLowerCase().includes('mandatory')) current.requiredCount += 1;
    if (item.configurable) current.configurableCount += 1;

    accumulator[item.appliesTo] = current;
    return accumulator;
  }, {});
}

function buildNodeIndex(productSpecifications, serviceSpecifications, resourceSpecifications, characteristicDefinitions) {
  const characteristicStats = buildCharacteristicStats(characteristicDefinitions);

  const makeNode = (item, type, subtitle) => {
    const stats = characteristicStats[item.code] || { items: [], requiredCount: 0, configurableCount: 0 };
    return {
      code: item.code,
      label: item.name,
      type,
      subtitle,
      characteristicCount: stats.items.length,
      requiredCount: stats.requiredCount,
      configurableCount: stats.configurableCount,
      characteristics: stats.items,
    };
  };

  return new Map([
    ...productSpecifications.map((item) => [item.code, makeNode(item, 'product', item.category || 'Product specification')]),
    ...serviceSpecifications.map((item) => [item.code, makeNode(item, 'service', item.summary || 'Service specification')]),
    ...resourceSpecifications.map((item) => [item.code, makeNode(item, 'resource', item.summary || 'Resource specification')]),
  ]);
}

function buildProductAutoPositions(productSpecifications, bundleEdges) {
  const childSet = new Set(bundleEdges.map((edge) => edge.child));
  const childrenByParent = new Map();
  for (const edge of bundleEdges) {
    const next = childrenByParent.get(edge.parent) || [];
    next.push(edge.child);
    childrenByParent.set(edge.parent, next);
  }

  const roots = productSpecifications
    .map((item) => item.code)
    .filter((code) => !childSet.has(code));

  if (roots.length === 0 && productSpecifications[0]) {
    roots.push(productSpecifications[0].code);
  }

  const levels = [];
  const queue = roots.map((code) => ({ code, depth: 0 }));
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current.code)) continue;
    visited.add(current.code);
    levels[current.depth] ||= [];
    levels[current.depth].push(current.code);

    const children = childrenByParent.get(current.code) || [];
    children.forEach((child) => {
      if (!visited.has(child)) queue.push({ code: child, depth: current.depth + 1 });
    });
  }

  for (const item of productSpecifications) {
    if (!visited.has(item.code)) {
      levels[0] ||= [];
      levels[0].push(item.code);
    }
  }

  const positions = {};
  levels.forEach((level, depth) => {
    level.forEach((code, index) => {
      positions[code] = {
        x: PRODUCT_ROOT_X + depth * (PRODUCT_NODE_WIDTH + PRODUCT_NODE_GAP_X),
        y: PRODUCT_ROOT_Y + index * (PRODUCT_NODE_HEIGHT + PRODUCT_NODE_GAP_Y),
      };
    });
  });
  return positions;
}

function buildServiceResourcePositions(serviceSpecifications, resourceSpecifications, serviceMapping) {
  const positions = {};
  serviceSpecifications.forEach((item, index) => {
    positions[item.code] = {
      x: SERVICE_COLUMN_X,
      y: SERVICE_ROOT_Y + index * (SERVICE_NODE_HEIGHT + SERVICE_GAP_Y),
    };
  });

  resourceSpecifications.forEach((item, index) => {
    positions[item.code] = {
      x: RESOURCE_COLUMN_X,
      y: SERVICE_ROOT_Y + index * (SERVICE_NODE_HEIGHT + SERVICE_GAP_Y),
    };
  });

  for (const row of serviceMapping) {
    const servicePosition = positions[row.serviceSpec];
    if (!servicePosition) continue;
    (row.resourceSpecs || []).forEach((resourceCode, index) => {
      if (!positions[resourceCode]) {
        positions[resourceCode] = {
          x: RESOURCE_COLUMN_X,
          y: servicePosition.y + index * (SERVICE_NODE_HEIGHT + SERVICE_GAP_Y),
        };
      }
    });
  }
  return positions;
}

function computeEdgePath(from, to) {
  const startX = from.x + from.width;
  const startY = from.y + from.height / 2;
  const endX = to.x;
  const endY = to.y + to.height / 2;
  const deltaX = Math.max(56, (endX - startX) / 2);
  return `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
}

function wouldCreateCycle(edges, parent, child) {
  const adjacency = new Map();
  edges.forEach((edge) => {
    if (edge.lane !== 'bundle') return;
    const next = adjacency.get(edge.parent) || [];
    next.push(edge.child);
    adjacency.set(edge.parent, next);
  });

  const stack = [child];
  const visited = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    if (current === parent) return true;
    visited.add(current);
    const next = adjacency.get(current) || [];
    next.forEach((item) => stack.push(item));
  }
  return false;
}

function buildNodeCards(productSpecifications, serviceSpecifications, resourceSpecifications, nodeIndex, bundleEdges, serviceLaneEdges, customPositions) {
  const autoProductPositions = buildProductAutoPositions(productSpecifications, bundleEdges);
  const servicePositions = buildServiceResourcePositions(serviceSpecifications, resourceSpecifications, serviceLaneEdges.reduce((rows, edge) => {
    if (edge.lane !== 'service') return rows;
    const existing = rows.find((row) => row.productSpec === edge.parent && row.serviceSpec === edge.child);
    if (!existing) rows.push({ productSpec: edge.parent, serviceSpec: edge.child, resourceSpecs: [] });
    return rows;
  }, []));

  const products = productSpecifications.map((item) => ({
    ...nodeIndex.get(item.code),
    x: customPositions[item.code]?.x ?? autoProductPositions[item.code]?.x ?? PRODUCT_ROOT_X,
    y: customPositions[item.code]?.y ?? autoProductPositions[item.code]?.y ?? PRODUCT_ROOT_Y,
    width: PRODUCT_NODE_WIDTH,
    height: PRODUCT_NODE_HEIGHT,
  }));

  const services = serviceSpecifications.map((item) => ({
    ...nodeIndex.get(item.code),
    x: customPositions[item.code]?.x ?? servicePositions[item.code]?.x ?? SERVICE_COLUMN_X,
    y: customPositions[item.code]?.y ?? servicePositions[item.code]?.y ?? SERVICE_ROOT_Y,
    width: SERVICE_NODE_WIDTH,
    height: SERVICE_NODE_HEIGHT,
  }));

  const resources = resourceSpecifications.map((item) => ({
    ...nodeIndex.get(item.code),
    x: customPositions[item.code]?.x ?? servicePositions[item.code]?.x ?? RESOURCE_COLUMN_X,
    y: customPositions[item.code]?.y ?? servicePositions[item.code]?.y ?? SERVICE_ROOT_Y,
    width: SERVICE_NODE_WIDTH,
    height: SERVICE_NODE_HEIGHT,
  }));

  return [...products, ...services, ...resources];
}

function buildPaletteItems(productSpecifications, nodeIndex, bundleEdges) {
  return productSpecifications.map((item) => {
    const node = nodeIndex.get(item.code);
    const outgoing = bundleEdges.filter((edge) => edge.parent === item.code).length;
    const incoming = bundleEdges.filter((edge) => edge.child === item.code).length;
    return {
      code: item.code,
      label: item.name,
      characteristicCount: node?.characteristicCount || 0,
      outgoing,
      incoming,
    };
  });
}

function laneForNodeTypes(parentType, childType) {
  if (parentType === 'product' && childType === 'product') return 'bundle';
  if (parentType === 'product' && childType === 'service') return 'service';
  if (parentType === 'service' && childType === 'resource') return 'resource';
  return null;
}

function buildServiceMappingFromEdges(edges) {
  const serviceEdges = edges.filter((edge) => edge.lane === 'service');
  const resourceEdges = edges.filter((edge) => edge.lane === 'resource');

  return serviceEdges.map((edge) => ({
    productSpec: edge.parent,
    serviceSpec: edge.child,
    resourceSpecs: resourceEdges.filter((item) => item.parent === edge.child).map((item) => item.child),
  }));
}

function computeLogicalBounds(nodes) {
  if (!nodes.length) {
    return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  }
  const width = Math.max(...nodes.map((node) => node.x + node.width)) + CANVAS_PADDING;
  const height = Math.max(...nodes.map((node) => node.y + node.height)) + CANVAS_PADDING;
  return {
    width: Math.max(width, CANVAS_WIDTH),
    height: Math.max(height, CANVAS_HEIGHT * 0.72),
  };
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
  const [selectedNodeId, setSelectedNodeId] = useState(productSpecifications[0]?.code || '');
  const [inspectorTab, setInspectorTab] = useState('overview');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [customPositions, setCustomPositions] = useState({});
  const [draft, setDraft] = useState({ parent: productSpecifications[0]?.code || '', child: '', min: 0, max: 1, defaultQty: 0 });
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hoveredDropTarget, setHoveredDropTarget] = useState('');
  const [relationModal, setRelationModal] = useState(null);
  const dragMetaRef = useRef(null);
  const viewportRef = useRef(null);
  const stageRef = useRef(null);

  useEffect(() => {
    if (!selectedEdgeId && edges[0]) setSelectedEdgeId(edges[0].id);
  }, [edges, selectedEdgeId]);

  useEffect(() => {
    if (!selectedNodeId && productSpecifications[0]) setSelectedNodeId(productSpecifications[0].code);
  }, [productSpecifications, selectedNodeId]);

  useEffect(() => {
    if (!viewportRef.current || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewportWidth(entry.contentRect.width);
    });

    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onPointerMove = (event) => {
      const current = dragMetaRef.current;
      if (!current || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const localX = (event.clientX - rect.left) / current.scale;
      const localY = (event.clientY - rect.top) / current.scale;
      const nextX = localX - current.offsetX;
      const nextY = localY - current.offsetY;
      setCustomPositions((prev) => ({
        ...prev,
        [current.code]: {
          x: Math.max(24, Math.min(current.boundsWidth - current.width - 24, nextX)),
          y: Math.max(24, Math.min(current.boundsHeight - current.height - 24, nextY)),
        },
      }));
    };

    const onPointerUp = () => {
      dragMetaRef.current = null;
      setHoveredDropTarget('');
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const bundleEdges = useMemo(() => edges.filter((item) => item.lane === 'bundle'), [edges]);

  const nodes = useMemo(
    () => buildNodeCards(productSpecifications, serviceSpecifications, resourceSpecifications, nodeIndex, bundleEdges, serviceLaneEdges, customPositions),
    [bundleEdges, customPositions, nodeIndex, productSpecifications, resourceSpecifications, serviceLaneEdges, serviceSpecifications],
  );

  const nodeLookup = useMemo(() => new Map(nodes.map((node) => [node.code, node])), [nodes]);
  const logicalBounds = useMemo(() => computeLogicalBounds(nodes), [nodes]);
  const fitScale = useMemo(() => {
    if (!viewportWidth) return 1;
    const available = Math.max(360, viewportWidth - CANVAS_PADDING * 1.5);
    return Math.min(1, available / logicalBounds.width);
  }, [logicalBounds.width, viewportWidth]);
  const stageHeight = Math.max(520, logicalBounds.height * fitScale + CANVAS_PADDING * 0.5);

  const visibleEdges = useMemo(
    () => edges.filter((edge) => laneFilter === 'all' || edge.lane === laneFilter),
    [edges, laneFilter],
  );

  const renderedEdges = useMemo(
    () => visibleEdges
      .map((edge) => {
        const parent = nodeLookup.get(edge.parent);
        const child = nodeLookup.get(edge.child);
        if (!parent || !child) return null;
        return {
          ...edge,
          path: computeEdgePath(parent, child),
        };
      })
      .filter(Boolean),
    [nodeLookup, visibleEdges],
  );

  const selectedEdge = edges.find((item) => item.id === selectedEdgeId) || null;
  const selectedNode = nodeLookup.get(selectedNodeId) || null;
  const selectedNodeIncoming = bundleEdges.filter((edge) => edge.child === selectedNodeId);
  const selectedNodeOutgoing = edges.filter((edge) => edge.parent === selectedNodeId);
  const paletteItems = useMemo(() => ([
    ...productSpecifications.map((item) => ({ ...item, type: 'product' })),
    ...serviceSpecifications.map((item) => ({ ...item, type: 'service' })),
    ...resourceSpecifications.map((item) => ({ ...item, type: 'resource' })),
  ].map((item) => {
    const node = nodeIndex.get(item.code);
    const outgoing = edges.filter((edge) => edge.parent === item.code).length;
    const incoming = edges.filter((edge) => edge.child === item.code).length;
    return {
      code: item.code,
      type: item.type,
      label: item.name,
      characteristicCount: node?.characteristicCount || 0,
      outgoing,
      incoming,
    };
  })), [edges, nodeIndex, productSpecifications, resourceSpecifications, serviceSpecifications]);

  async function persist(nextEdges) {
    setSaving(true);
    setSaveError('');
    try {
      const bundleOnlyEdges = nextEdges.filter((item) => item.lane === 'bundle').map(({ id, ...rest }) => rest);
      const serviceMappingFromEdges = buildServiceMappingFromEdges(nextEdges);
      const response = await fetch(`/api/catalogs/${catalogSlug}/hierarchy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: bundleOnlyEdges, serviceMapping: serviceMappingFromEdges }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to persist the hierarchy graph.');
      }
      const persistedBundleEdges = (payload.items || []).map(normalizeEdge);
      const next = [...persistedBundleEdges, ...serviceLaneEdges.map(normalizeEdge)];
      setEdges(next);
      if (!next.find((item) => item.id === selectedEdgeId)) setSelectedEdgeId(next[0]?.id || '');
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function syncSelectedNode(code) {
    setSelectedNodeId(code);
    const firstRelatedEdge = edges.find((edge) => edge.parent === code || edge.child === code);
    if (firstRelatedEdge) setSelectedEdgeId(firstRelatedEdge.id);
  }

  async function addBundleEdge(parent, child, options = draft) {
    if (!parent || !child) {
      setSaveError('Choose both a parent and a child product.');
      return false;
    }
    if (parent === child) {
      setSaveError('A node cannot be linked to itself.');
      return false;
    }
    const parentNode = nodeLookup.get(parent);
    const childNode = nodeLookup.get(child);
    const lane = laneForNodeTypes(parentNode?.type, childNode?.type);
    if (!lane) {
      setSaveError('Unsupported hierarchy relation type. Allowed: product→product, product→service, service→resource.');
      return false;
    }
    if (lane === 'bundle' && wouldCreateCycle(bundleEdges, parent, child)) {
      setSaveError('That drop would create a bundle cycle. Choose another parent/child pair.');
      return false;
    }
    const duplicate = edges.find((edge) => edge.parent === parent && edge.child === child && edge.lane === lane);
    if (duplicate) {
      setSelectedEdgeId(duplicate.id);
      setSaveError('The selected relationship already exists.');
      return false;
    }

    const nextEdges = [
      ...edges,
      normalizeEdge({ parent, child, min: options.min, max: options.max, defaultQty: options.defaultQty, lane }),
    ];
    const saved = await persist(nextEdges);
    if (saved) setSelectedNodeId(child);
    return saved;
  }

  async function updateSelectedBundleEdge() {
    if (!selectedEdge || selectedEdge.lane !== 'bundle') return;
    const nextEdges = edges.map((edge) => (edge.id === selectedEdge.id
      ? normalizeEdge({ ...edge, min: draft.min, max: draft.max, defaultQty: draft.defaultQty })
      : edge));
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
    setCustomPositions({});
  }

  function handleNodePointerDown(event, node) {
    if (!stageRef.current) return;
    if (event.target.closest('[data-node-action="remove"]')) return;

    const rect = stageRef.current.getBoundingClientRect();
    const localX = (event.clientX - rect.left) / fitScale;
    const localY = (event.clientY - rect.top) / fitScale;
    dragMetaRef.current = {
      code: node.code,
      offsetX: localX - node.x,
      offsetY: localY - node.y,
      width: node.width,
      height: node.height,
      scale: fitScale,
      boundsWidth: logicalBounds.width,
      boundsHeight: logicalBounds.height,
    };
  }

  function openRelationBuilder(overrides = {}) {
    const defaultParent = selectedNode?.type === 'product'
      ? (selectedNodeId || productSpecifications[0]?.code || '')
      : (productSpecifications[0]?.code || '');

    setRelationModal({
      parent: overrides.parent ?? defaultParent,
      child: overrides.child || '',
      min: overrides.min ?? 0,
      max: overrides.max ?? 1,
      defaultQty: overrides.defaultQty ?? 0,
      targetX: overrides.targetX ?? null,
      targetY: overrides.targetY ?? null,
      source: overrides.source || 'palette',
      prelinkedTarget: overrides.prelinkedTarget || '',
    });
  }

  function closeRelationBuilder() {
    setRelationModal(null);
    setHoveredDropTarget('');
  }

  function handlePaletteDragStart(event, code) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/upc-product-code', code);
  }

  function openDropModalFromEvent(event, parentCode = '') {
    event.preventDefault();
    const draggedCode = event.dataTransfer.getData('text/upc-product-code');
    if (!draggedCode) return;

    let dropPoint = { targetX: null, targetY: null };
    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const localX = (event.clientX - rect.left) / fitScale;
      const localY = (event.clientY - rect.top) / fitScale;
      dropPoint = {
        targetX: Math.max(24, Math.min(logicalBounds.width - PRODUCT_NODE_WIDTH - 24, localX - PRODUCT_NODE_WIDTH * 0.2)),
        targetY: Math.max(24, Math.min(logicalBounds.height - PRODUCT_NODE_HEIGHT - 24, localY - PRODUCT_NODE_HEIGHT * 0.5)),
      };
    }

    const parentType = parentCode ? nodeLookup.get(parentCode)?.type : 'product';
    const childType = nodeLookup.get(draggedCode)?.type;
    const defaultLane = laneForNodeTypes(parentType, childType) || 'bundle';

    openRelationBuilder({
      parent: parentCode,
      child: draggedCode,
      lane: defaultLane,
      source: parentCode ? 'node-drop' : 'canvas-drop',
      prelinkedTarget: parentCode,
      ...dropPoint,
    });
  }

  async function submitRelationBuilder() {
    if (!relationModal) return;
    if (Number.isFinite(Number(relationModal.targetX)) && Number.isFinite(Number(relationModal.targetY))) {
      setCustomPositions((prev) => ({
        ...prev,
        [relationModal.child]: {
          x: relationModal.targetX,
          y: relationModal.targetY,
        },
      }));
    }

    const saved = await addBundleEdge(relationModal.parent, relationModal.child, relationModal);
    if (saved) closeRelationBuilder();
  }

  useEffect(() => {
    if (!selectedEdge || selectedEdge.lane !== 'bundle') return;
    setDraft((prev) => ({
      ...prev,
      parent: selectedEdge.parent,
      child: selectedEdge.child,
      min: selectedEdge.min,
      max: selectedEdge.max ?? '',
      defaultQty: selectedEdge.defaultQty,
    }));
  }, [selectedEdge]);

  return (
    <div className={styles.wrapper}>
      {saveError ? <p className="ds-field__error">{saveError}</p> : null}

      <div className={styles.metricStrip}>
        <Card padding="md" className={styles.metricCard}>
          <span className={styles.metricLabel}>Bundle edges</span>
          <strong className={styles.metricValue}>{bundleEdges.length}</strong>
          <span className={styles.metricMeta}>Editable product hierarchy</span>
        </Card>
        <Card padding="md" className={styles.metricCard}>
          <span className={styles.metricLabel}>Mapped services</span>
          <strong className={styles.metricValue}>{edges.filter((item) => item.lane === 'service').length}</strong>
          <span className={styles.metricMeta}>Product → service decomposition</span>
        </Card>
        <Card padding="md" className={styles.metricCard}>
          <span className={styles.metricLabel}>Mapped resources</span>
          <strong className={styles.metricValue}>{edges.filter((item) => item.lane === 'resource').length}</strong>
          <span className={styles.metricMeta}>Service → resource decomposition</span>
        </Card>
        <Card padding="md" className={styles.metricCard}>
          <span className={styles.metricLabel}>Characteristic definitions</span>
          <strong className={styles.metricValue}>{characteristicDefinitions.length}</strong>
          <span className={styles.metricMeta}>Reflected directly on nodes</span>
        </Card>
      </div>

      <div className={styles.controlGrid}>
        <div className={styles.leftRailStack}>
          <Card
            title="Structure palette"
            description="Drag a product into the visual studio below. A relation builder dialog lets you choose the parent, child and bundle cardinality before saving."
            padding="md"
          >
            <div className={styles.paletteList}>
              {paletteItems.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={cx(styles.paletteItem, selectedNodeId === item.code && styles.paletteItemActive)}
                  draggable
                  onDragStart={(event) => handlePaletteDragStart(event, item.code)}
                  onClick={() => syncSelectedNode(item.code)}
                >
                  <div className={styles.paletteItemTop}>
                    <span className={styles.paletteItemCode}>{item.code}</span>
                    <span className={styles.paletteBadge}>{item.type}</span>
                    <span className={styles.paletteBadge}>{item.characteristicCount} char</span>
                  </div>
                  <strong>{item.label}</strong>
                  <span className={styles.paletteMeta}>Parents {item.incoming} · Children {item.outgoing}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Canvas controls" padding="md">
            <div className={styles.controlStack}>
              <label className={styles.filterField}>
                <span>Visible lane</span>
                <select value={laneFilter} onChange={(event) => setLaneFilter(event.target.value)}>
                  <option value="all">All lanes</option>
                  <option value="bundle">Bundle structure</option>
                  <option value="service">Product → Service</option>
                  <option value="resource">Service → Resource</option>
                </select>
              </label>
              <div className={styles.inlineActions}>
                <Button variant="secondary" onClick={resetToDefault} loading={saving}>Reset layout</Button>
                <Button variant="ghost" onClick={() => setCustomPositions({})}>Auto arrange</Button>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Inspector" padding="md" className={styles.inspectorRail}>
          <Tabs
            value={inspectorTab}
            onChange={setInspectorTab}
            items={[
              { value: 'overview', label: 'Overview' },
              { value: 'relationships', label: 'Relationships', badge: selectedEdge ? 1 : null },
              { value: 'characteristics', label: 'Characteristics', badge: selectedNode?.characteristicCount || 0 },
            ]}
          />

          {inspectorTab === 'overview' ? (
            selectedNode ? (
              <div className={styles.inspectorStack}>
                <div className={styles.inspectorHero}>
                  <span className={styles.inspectorType}>{selectedNode.type}</span>
                  <h3>{selectedNode.label}</h3>
                  <code>{selectedNode.code}</code>
                  <p>{selectedNode.subtitle}</p>
                </div>
                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}><span>Incoming</span><strong>{selectedNodeIncoming.length}</strong></div>
                  <div className={styles.kpiCard}><span>Outgoing</span><strong>{selectedNodeOutgoing.length}</strong></div>
                  <div className={styles.kpiCard}><span>Characteristics</span><strong>{selectedNode.characteristicCount}</strong></div>
                  <div className={styles.kpiCard}><span>Configurable</span><strong>{selectedNode.configurableCount}</strong></div>
                </div>
                <div className={styles.miniSection}>
                  <h4>Related relationships</h4>
                  <div className={styles.tokenList}>
                    {selectedNodeOutgoing.map((edge) => (
                      <button key={edge.id} type="button" className={styles.edgeToken} onClick={() => { setSelectedEdgeId(edge.id); setInspectorTab('relationships'); }}>
                        {edge.lane} · {edge.parent} → {edge.child}
                      </button>
                    ))}
                    {selectedNodeOutgoing.length === 0 ? <p className={styles.mutedText}>No outgoing relationships from this node.</p> : null}
                  </div>
                </div>
              </div>
            ) : <p className={styles.mutedText}>Select a node from the graph or palette.</p>
          ) : null}

          {inspectorTab === 'relationships' ? (
            <div className={styles.inspectorStack}>
              {selectedEdge ? (
                <>
                  <div className={styles.relationHero}>
                    <span className={styles.edgeLanePill}>{selectedEdge.lane}</span>
                    <strong>{selectedEdge.parent} → {selectedEdge.child}</strong>
                    <span className={styles.mutedText}>Min {selectedEdge.min} · Max {selectedEdge.max ?? '∞'} · Default {selectedEdge.defaultQty}</span>
                  </div>
                  {['bundle', 'service', 'resource'].includes(selectedEdge.lane) ? (
                    <>
                      <div className={styles.compactGrid}>
                        <Input label="Parent" value={draft.parent} onChange={(event) => setDraft((prev) => ({ ...prev, parent: event.target.value }))} />
                        <Input label="Child" value={draft.child} onChange={(event) => setDraft((prev) => ({ ...prev, child: event.target.value }))} />
                      </div>
                      <div className={styles.compactGrid}>
                        <Input label="Min" type="number" value={draft.min} onChange={(event) => setDraft((prev) => ({ ...prev, min: event.target.value }))} />
                        <Input label="Max" type="number" value={draft.max} onChange={(event) => setDraft((prev) => ({ ...prev, max: event.target.value }))} />
                        <Input label="Default qty" type="number" value={draft.defaultQty} onChange={(event) => setDraft((prev) => ({ ...prev, defaultQty: event.target.value }))} />
                      </div>
                      <div className={styles.inlineActions}>
                        <Button onClick={updateSelectedBundleEdge} loading={saving}>Save edge</Button>
                        <Button variant="danger" onClick={() => setDeleteTarget(selectedEdge)}>Delete edge</Button>
                      </div>
                    </>
                  ) : null}
                </>
              ) : <p className={styles.mutedText}>Select a relationship from the graph or overview panel.</p>}

              <div className={styles.separator} />

              <div className={styles.miniSection}>
                <h4>Create bundle relationship</h4>
                <p className={styles.mutedText}>Prefer drag-and-drop in the studio for a faster visual flow, or use the manual builder below.</p>
                <label className={styles.filterField}>
                  <span>Parent product</span>
                  <select value={draft.parent} onChange={(event) => setDraft((prev) => ({ ...prev, parent: event.target.value }))}>
                    {[...productSpecifications, ...serviceSpecifications].map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}
                  </select>
                </label>
                <label className={styles.filterField}>
                  <span>Child node</span>
                  <select value={draft.child} onChange={(event) => setDraft((prev) => ({ ...prev, child: event.target.value }))}>
                    <option value="">Select child…</option>
                    {[...productSpecifications, ...serviceSpecifications, ...resourceSpecifications].map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}
                  </select>
                </label>
                <div className={styles.compactGrid}>
                  <Input label="Min" type="number" value={draft.min} onChange={(event) => setDraft((prev) => ({ ...prev, min: event.target.value }))} />
                  <Input label="Max" type="number" value={draft.max} onChange={(event) => setDraft((prev) => ({ ...prev, max: event.target.value }))} />
                  <Input label="Default qty" type="number" value={draft.defaultQty} onChange={(event) => setDraft((prev) => ({ ...prev, defaultQty: event.target.value }))} />
                </div>
                <Button onClick={() => addBundleEdge(draft.parent, draft.child, draft)} loading={saving}>Add bundle edge</Button>
              </div>
            </div>
          ) : null}

          {inspectorTab === 'characteristics' ? (
            selectedNode ? (
              <div className={styles.inspectorStack}>
                <div className={styles.miniSection}>
                  <h4>Characteristic summary</h4>
                  <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}><span>Total</span><strong>{selectedNode.characteristicCount}</strong></div>
                    <div className={styles.kpiCard}><span>Required</span><strong>{selectedNode.requiredCount}</strong></div>
                    <div className={styles.kpiCard}><span>Configurable</span><strong>{selectedNode.configurableCount}</strong></div>
                  </div>
                </div>
                <div className={styles.characteristicList}>
                  {selectedNode.characteristics.map((item) => (
                    <article key={`${item.appliesTo}-${item.name}`} className={styles.characteristicCard}>
                      <div className={styles.characteristicTop}>
                        <strong>{item.displayName}</strong>
                        <span className={styles.characteristicType}>{item.valueType}</span>
                      </div>
                      <div className={styles.tokenList}>
                        <span className={styles.inlineToken}>{item.presence}</span>
                        <span className={styles.inlineToken}>{item.configurable ? 'configurable' : 'fixed'}</span>
                        <span className={styles.inlineToken}>{item.minCardinality}..{item.maxCardinality ?? '∞'}</span>
                      </div>
                      <p className={styles.mutedText}>{item.interpretation}</p>
                    </article>
                  ))}
                  {selectedNode.characteristics.length === 0 ? <p className={styles.mutedText}>No characteristics mapped to this node yet. Add them from the characteristic manager and they will be reflected here.</p> : null}
                </div>
                <Button variant="secondary" onClick={() => { window.location.href = `/catalogs/${catalogSlug}/characteristics`; }}>Open characteristic manager</Button>
              </div>
            ) : <p className={styles.mutedText}>Select a node to inspect its characteristic model.</p>
          ) : null}
        </Card>
      </div>

      <Card
        title="Visual hierarchy studio"
        description="The full product → service → resource structure is rendered below in one connected graph. Drag nodes to rearrange the layout, drag palette items into the stage to open a relation builder, and remove bundle edges with the minus action on child nodes."
        padding="lg"
        actions={(
          <div className={styles.legendRow}>
            <span className={cx(styles.legendChip, styles.legendProduct)}>Product</span>
            <span className={cx(styles.legendChip, styles.legendService)}>Service</span>
            <span className={cx(styles.legendChip, styles.legendResource)}>Resource</span>
          </div>
        )}
      >
        <div className={styles.canvasViewportFull} ref={viewportRef}>
          <div
            className={styles.canvasSurfaceFull}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => openDropModalFromEvent(event)}
            style={{ minHeight: `${stageHeight}px` }}
          >
            <div
              className={styles.canvasStage}
              ref={stageRef}
              style={{ width: `${logicalBounds.width}px`, height: `${logicalBounds.height}px`, transform: `scale(${fitScale})` }}
            >
              <svg className={styles.canvasSvg} viewBox={`0 0 ${logicalBounds.width} ${logicalBounds.height}`} preserveAspectRatio="xMinYMin meet" aria-hidden="true">
                {renderedEdges.map((edge) => (
                  <g key={edge.id} className={cx(styles.edgeGroup, selectedEdgeId === edge.id && styles.edgeGroupActive)} onClick={() => setSelectedEdgeId(edge.id)}>
                    <path d={edge.path} className={cx(styles.edgePath, edge.lane === 'bundle' && styles.edgeBundle, edge.lane === 'service' && styles.edgeService, edge.lane === 'resource' && styles.edgeResource)} />
                  </g>
                ))}
              </svg>

              <div className={styles.laneLabel} style={{ left: 'var(--studio-product-lane-left)' }}>Products</div>
              <div className={styles.laneLabel} style={{ left: 'var(--studio-service-lane-left)' }}>Services</div>
              <div className={styles.laneLabel} style={{ left: 'var(--studio-resource-lane-left)' }}>Resources</div>

              {nodes.map((node) => {
                const removableBundleEdge = edges.find((edge) => edge.child === node.code);
                return (
                  <div
                    key={node.code}
                    className={cx(
                      styles.graphNode,
                      node.type === 'product' && styles.graphNodeProduct,
                      node.type === 'service' && styles.graphNodeService,
                      node.type === 'resource' && styles.graphNodeResource,
                      selectedNodeId === node.code && styles.graphNodeActive,
                      hoveredDropTarget === node.code && styles.graphNodeDropTarget,
                    )}
                    style={{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, minHeight: `${node.height}px` }}
                    role="button"
                    tabIndex={0}
                    onClick={() => syncSelectedNode(node.code)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        syncSelectedNode(node.code);
                      }
                    }}
                    onPointerDown={(event) => handleNodePointerDown(event, node)}
                    onDragOver={(event) => {
                      if (node.type !== 'product') return;
                      event.preventDefault();
                      setHoveredDropTarget(node.code);
                    }}
                    onDragLeave={() => setHoveredDropTarget('')}
                    onDrop={(event) => {
                      if (node.type !== 'product') return;
                      setHoveredDropTarget('');
                      openDropModalFromEvent(event, node.code);
                    }}
                  >
                    {removableBundleEdge ? (
                      <button
                        type="button"
                        data-node-action="remove"
                        className={styles.nodeRemoveButton}
                        aria-label={`Remove relationship for ${node.label}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(removableBundleEdge);
                        }}
                      >
                        −
                      </button>
                    ) : null}
                    <span className={styles.graphNodeType}>{node.type}</span>
                    <strong className={styles.graphNodeTitle}>{node.label}</strong>
                    <code className={styles.graphNodeCode}>{node.code}</code>
                    <span className={styles.graphNodeSubtitle}>{node.subtitle}</span>
                    <div className={styles.graphNodeMetrics}>
                      <span className={styles.graphNodePill}>{node.characteristicCount} char</span>
                      <span className={styles.graphNodePill}>{node.requiredCount} req</span>
                      <span className={styles.graphNodePill}>{node.configurableCount} conf</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete hierarchy edge"
        description="This removes the selected relationship from the persisted hierarchy graph."
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

      <Modal
        open={Boolean(relationModal)}
        onClose={closeRelationBuilder}
        title="Create bundle relationship"
        description="Choose the parent, child and quantities before the relationship is added to the visual hierarchy."
        actions={(
          <>
            <Button variant="ghost" onClick={closeRelationBuilder}>Cancel</Button>
            <Button onClick={submitRelationBuilder} loading={saving}>Create relationship</Button>
          </>
        )}
      >
        {relationModal ? (
          <div className={styles.relationModalBody}>
            <div className={styles.tokenList}>
              <span className={styles.inlineToken}>{relationModal.source === 'node-drop' ? 'Dropped on product node' : 'Dropped on canvas'}</span>
              {relationModal.prelinkedTarget ? <span className={styles.inlineToken}>Target {relationModal.prelinkedTarget}</span> : null}
            </div>
            <label className={styles.filterField}>
              <span>Parent product</span>
              <select value={relationModal.parent} onChange={(event) => setRelationModal((prev) => ({ ...prev, parent: event.target.value }))}>
                <option value="">Select parent…</option>
                {[...productSpecifications, ...serviceSpecifications].map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}
              </select>
            </label>
            <label className={styles.filterField}>
              <span>Child product</span>
              <select value={relationModal.child} onChange={(event) => setRelationModal((prev) => ({ ...prev, child: event.target.value }))}>
                <option value="">Select child…</option>
                {[...productSpecifications, ...serviceSpecifications, ...resourceSpecifications].map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}
              </select>
            </label>
            <div className={styles.compactGrid}>
              <Input label="Min" type="number" value={relationModal.min} onChange={(event) => setRelationModal((prev) => ({ ...prev, min: event.target.value }))} />
              <Input label="Max" type="number" value={relationModal.max} onChange={(event) => setRelationModal((prev) => ({ ...prev, max: event.target.value }))} />
              <Input label="Default qty" type="number" value={relationModal.defaultQty} onChange={(event) => setRelationModal((prev) => ({ ...prev, defaultQty: event.target.value }))} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
