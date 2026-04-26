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
const DEFAULT_LANE_LAYOUT = {
  productX: PRODUCT_ROOT_X,
  serviceX: SERVICE_COLUMN_X - 120,
  resourceX: RESOURCE_COLUMN_X - 120,
};

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

function cloneEdges(edges) {
  return edges.map((edge) => normalizeEdge({ ...edge }));
}

function deepCloneValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value ?? null));
}

function buildInitialRootNodeCodes(initialEdges, productSpecifications) {
  const normalizedEdges = cloneEdges(initialEdges || []);
  const childCodes = new Set(normalizedEdges.map((edge) => edge.child));
  const rootCodes = new Set(
    normalizedEdges
      .map((edge) => edge.parent)
      .filter((code) => code && !childCodes.has(code)),
  );

  if (rootCodes.size === 0 && productSpecifications[0]?.code) {
    rootCodes.add(productSpecifications[0].code);
  }

  return rootCodes;
}

function buildActiveNodeCodes(edges, rootNodeCodes, fallbackProductCode, removedNodeCodes = new Set()) {
  const active = new Set(rootNodeCodes || []);
  edges.forEach((edge) => {
    if (edge.parent) active.add(edge.parent);
    if (edge.child) active.add(edge.child);
  });

  if (active.size === 0 && fallbackProductCode && !removedNodeCodes.has(fallbackProductCode)) {
    active.add(fallbackProductCode);
  }

  removedNodeCodes.forEach((code) => active.delete(code));
  return active;
}

function collectDescendantCodes(edges, rootCode) {
  const childrenByParent = new Map();
  edges.forEach((edge) => {
    const children = childrenByParent.get(edge.parent) || [];
    children.push(edge.child);
    childrenByParent.set(edge.parent, children);
  });

  const removed = new Set();
  const stack = [rootCode];
  while (stack.length) {
    const current = stack.pop();
    if (!current || removed.has(current)) continue;
    removed.add(current);
    (childrenByParent.get(current) || []).forEach((child) => stack.push(child));
  }

  return removed;
}

function getIncomingEdges(edges, code) {
  return edges.filter((edge) => edge.child === code);
}

function buildEdgesFromServiceMapping(serviceMapping) {
  return serviceMapping.flatMap((row) => [
    { parent: row.productSpec, child: row.serviceSpec, min: 1, max: 1, defaultQty: 1, lane: 'service' },
    ...(row.resourceSpecs || []).map((resourceCode) => ({ parent: row.serviceSpec, child: resourceCode, min: 0, max: 1, defaultQty: 0, lane: 'resource' })),
  ]).map(normalizeEdge);
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

function buildProductAutoPositions(productSpecifications, bundleEdges, laneLayout = DEFAULT_LANE_LAYOUT) {
  const productStartX = laneLayout.productX + 24;
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
        x: productStartX + depth * (PRODUCT_NODE_WIDTH + PRODUCT_NODE_GAP_X),
        y: PRODUCT_ROOT_Y + index * (PRODUCT_NODE_HEIGHT + PRODUCT_NODE_GAP_Y),
      };
    });
  });
  return positions;
}

function buildServiceResourcePositions(serviceSpecifications, resourceSpecifications, serviceMapping, laneLayout = DEFAULT_LANE_LAYOUT) {
  const serviceStartX = laneLayout.serviceX + 24;
  const resourceStartX = laneLayout.resourceX + 24;
  const positions = {};
  serviceSpecifications.forEach((item, index) => {
    positions[item.code] = {
      x: serviceStartX,
      y: SERVICE_ROOT_Y + index * (SERVICE_NODE_HEIGHT + SERVICE_GAP_Y),
    };
  });

  resourceSpecifications.forEach((item, index) => {
    positions[item.code] = {
      x: resourceStartX,
      y: SERVICE_ROOT_Y + index * (SERVICE_NODE_HEIGHT + SERVICE_GAP_Y),
    };
  });

  for (const row of serviceMapping) {
    const servicePosition = positions[row.serviceSpec];
    if (!servicePosition) continue;
    (row.resourceSpecs || []).forEach((resourceCode, index) => {
      if (!positions[resourceCode]) {
        positions[resourceCode] = {
          x: resourceStartX,
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

function buildNodeCards(productSpecifications, serviceSpecifications, resourceSpecifications, nodeIndex, bundleEdges, serviceResourceEdges, customPositions, activeNodeCodes, laneLayout = DEFAULT_LANE_LAYOUT) {
  const visibleProductSpecifications = productSpecifications.filter((item) => activeNodeCodes.has(item.code));
  const visibleServiceSpecifications = serviceSpecifications.filter((item) => activeNodeCodes.has(item.code));
  const visibleResourceSpecifications = resourceSpecifications.filter((item) => activeNodeCodes.has(item.code));
  const visibleBundleEdges = bundleEdges.filter((edge) => activeNodeCodes.has(edge.parent) && activeNodeCodes.has(edge.child));
  const visibleServiceResourceEdges = serviceResourceEdges.filter((edge) => activeNodeCodes.has(edge.parent) && activeNodeCodes.has(edge.child));

  const autoProductPositions = buildProductAutoPositions(visibleProductSpecifications, visibleBundleEdges, laneLayout);
  const servicePositions = buildServiceResourcePositions(
    visibleServiceSpecifications,
    visibleResourceSpecifications,
    buildServiceMappingFromEdges(visibleServiceResourceEdges),
    laneLayout,
  );

  const products = visibleProductSpecifications.map((item) => ({
    ...nodeIndex.get(item.code),
    x: customPositions[item.code]?.x ?? autoProductPositions[item.code]?.x ?? PRODUCT_ROOT_X,
    y: customPositions[item.code]?.y ?? autoProductPositions[item.code]?.y ?? PRODUCT_ROOT_Y,
    width: PRODUCT_NODE_WIDTH,
    height: PRODUCT_NODE_HEIGHT,
  }));

  const services = visibleServiceSpecifications.map((item) => ({
    ...nodeIndex.get(item.code),
    x: customPositions[item.code]?.x ?? servicePositions[item.code]?.x ?? (laneLayout.serviceX + 24),
    y: customPositions[item.code]?.y ?? servicePositions[item.code]?.y ?? SERVICE_ROOT_Y,
    width: SERVICE_NODE_WIDTH,
    height: SERVICE_NODE_HEIGHT,
  }));

  const resources = visibleResourceSpecifications.map((item) => ({
    ...nodeIndex.get(item.code),
    x: customPositions[item.code]?.x ?? servicePositions[item.code]?.x ?? (laneLayout.resourceX + 24),
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

function toCode(value, fallbackPrefix = 'ITEM') {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || `${fallbackPrefix}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
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
  initialStudioState = {},
}) {
  const [productSpecsState, setProductSpecsState] = useState(() => Array.isArray(productSpecifications) ? productSpecifications : []);
  const [serviceSpecsState, setServiceSpecsState] = useState(() => Array.isArray(serviceSpecifications) ? serviceSpecifications : []);
  const [resourceSpecsState, setResourceSpecsState] = useState(() => Array.isArray(resourceSpecifications) ? resourceSpecifications : []);
  const [offeringState, setOfferingState] = useState([]);
  const [categoryState, setCategoryState] = useState([]);
  const [offeringCategoryState, setOfferingCategoryState] = useState([]);

  const nodeIndex = useMemo(
    () => buildNodeIndex(productSpecsState, serviceSpecsState, resourceSpecsState, characteristicDefinitions),
    [characteristicDefinitions, productSpecsState, resourceSpecsState, serviceSpecsState],
  );

  const initialServiceResourceEdges = useMemo(
    () => buildEdgesFromServiceMapping(serviceMapping),
    [serviceMapping],
  );

  const initialGraphEdges = useMemo(
    () => cloneEdges([...initialHierarchy.map(normalizeEdge), ...initialServiceResourceEdges]),
    [initialHierarchy, initialServiceResourceEdges],
  );

  const [edges, setEdges] = useState(() => cloneEdges(initialGraphEdges));
  const [rootNodeCodes, setRootNodeCodes] = useState(() => new Set(
    Array.isArray(initialStudioState.rootNodeCodes) && initialStudioState.rootNodeCodes.length
      ? initialStudioState.rootNodeCodes
      : [...buildInitialRootNodeCodes(initialGraphEdges, productSpecsState)],
  ));
  const [removedNodeCodes, setRemovedNodeCodes] = useState(() => new Set(
    Array.isArray(initialStudioState.removedNodeCodes) ? initialStudioState.removedNodeCodes : [],
  ));
  const [laneFilter, setLaneFilter] = useState('all');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(productSpecsState[0]?.code || '');
  const [inspectorTab, setInspectorTab] = useState('overview');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastTone, setToastTone] = useState('success');
  const [saving, setSaving] = useState(false);
  const [customPositions, setCustomPositions] = useState(() => initialStudioState.customPositions || {});
  const [laneLayout, setLaneLayout] = useState(() => ({ ...DEFAULT_LANE_LAYOUT, ...(initialStudioState.laneLayout || {}) }));
  const [draft, setDraft] = useState({ parent: productSpecsState[0]?.code || '', child: '', min: 0, max: 1, defaultQty: 0 });
  const [entityDraft, setEntityDraft] = useState({ type: 'product', code: '', name: '', summary: '', category: '' });
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hoveredDropTarget, setHoveredDropTarget] = useState('');
  const [isCanvasDropActive, setIsCanvasDropActive] = useState(false);
  const [relationModal, setRelationModal] = useState(null);
  const [relationshipManager, setRelationshipManager] = useState(null);
  const [openPaletteSections, setOpenPaletteSections] = useState({
    products: false,
    services: false,
    resources: false,
    characteristics: false,
  });
  const dragMetaRef = useRef(null);
  const laneDragRef = useRef(null);
  const viewportRef = useRef(null);
  const stageRef = useRef(null);

  useEffect(() => {
    if (!selectedEdgeId && edges[0]) setSelectedEdgeId(edges[0].id);
  }, [edges, selectedEdgeId]);

  useEffect(() => {
    if (!selectedNodeId && productSpecsState[0]) setSelectedNodeId(productSpecsState[0].code);
  }, [productSpecsState, selectedNodeId]);

  useEffect(() => {
    let mounted = true;
    async function loadEntities() {
      try {
        const response = await fetch(`/api/catalogs/${catalogSlug}/entities`);
        const payload = await response.json().catch(() => ({}));
        if (!mounted || !response.ok || !payload.ok) return;
        setProductSpecsState(payload.item.productSpecifications || []);
        setServiceSpecsState(payload.item.serviceSpecifications || []);
        setResourceSpecsState(payload.item.resourceSpecifications || []);
        setOfferingState(payload.item.productOfferings || []);
        setCategoryState(payload.item.catalogCategories || []);
        setOfferingCategoryState(payload.item.offeringCategories || []);
      } catch (_error) {
        // Non-blocking: fallback is server-rendered props.
      }
    }
    void loadEntities();
    return () => { mounted = false; };
  }, [catalogSlug]);

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
      const laneDrag = laneDragRef.current;
      if (laneDrag) {
        const delta = (event.clientX - laneDrag.startClientX) / laneDrag.scale;
        setLaneLayout((prev) => {
          const next = { ...prev };
          const raw = laneDrag.startValue + delta;
          if (laneDrag.key === 'productX') {
            next.productX = Math.max(24, Math.min(prev.serviceX - 280, raw));
          }
          if (laneDrag.key === 'serviceX') {
            next.serviceX = Math.max(prev.productX + 280, Math.min(prev.resourceX - 280, raw));
          }
          if (laneDrag.key === 'resourceX') {
            next.resourceX = Math.max(prev.serviceX + 280, raw);
          }
          return next;
        });
        return;
      }

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
          x: Math.max(0, nextX),
          y: Math.max(0, nextY),
        },
      }));
    };

    const onPointerUp = () => {
      dragMetaRef.current = null;
      laneDragRef.current = null;
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
  const serviceResourceEdges = useMemo(() => edges.filter((item) => item.lane === 'service' || item.lane === 'resource'), [edges]);

  const activeNodeCodes = useMemo(
    () => buildActiveNodeCodes(edges, rootNodeCodes, productSpecsState[0]?.code || '', removedNodeCodes),
    [edges, productSpecsState, removedNodeCodes, rootNodeCodes],
  );

  const nodes = useMemo(
    () => buildNodeCards(productSpecsState, serviceSpecsState, resourceSpecsState, nodeIndex, bundleEdges, serviceResourceEdges, customPositions, activeNodeCodes, laneLayout),
    [activeNodeCodes, bundleEdges, customPositions, laneLayout, nodeIndex, productSpecsState, resourceSpecsState, serviceResourceEdges, serviceSpecsState],
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
  const selectedNodeIncoming = edges.filter((edge) => edge.child === selectedNodeId);
  const selectedNodeOutgoing = edges.filter((edge) => edge.parent === selectedNodeId);
  const paletteItems = useMemo(() => ([
    ...productSpecsState.map((item) => ({ ...item, type: 'product' })),
    ...serviceSpecsState.map((item) => ({ ...item, type: 'service' })),
    ...resourceSpecsState.map((item) => ({ ...item, type: 'resource' })),
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
  })), [edges, nodeIndex, productSpecsState, resourceSpecsState, serviceSpecsState]);

  const characteristicPaletteItems = useMemo(() => characteristicDefinitions.map((item, index) => ({
    code: item.name || `CHAR_${index + 1}`,
    type: 'characteristic',
    label: item.displayName || item.name || `Characteristic ${index + 1}`,
    characteristicCount: 0,
    incoming: item.appliesTo ? 1 : 0,
    outgoing: 0,
    appliesTo: item.appliesTo || 'unmapped',
  })), [characteristicDefinitions]);

  const paletteGroups = useMemo(() => [
    { key: 'products', label: 'Products', tone: styles.paletteGroupProducts, items: paletteItems.filter((item) => item.type === 'product'), draggable: true },
    { key: 'services', label: 'Services', tone: styles.paletteGroupServices, items: paletteItems.filter((item) => item.type === 'service'), draggable: true },
    { key: 'resources', label: 'Resources', tone: styles.paletteGroupResources, items: paletteItems.filter((item) => item.type === 'resource'), draggable: true },
    { key: 'characteristics', label: 'Characteristics', tone: styles.paletteGroupCharacteristics, items: characteristicPaletteItems, draggable: false },
  ], [characteristicPaletteItems, paletteItems]);

  async function persist(nextEdges, options = {}) {
    const previousState = {
      edges: cloneEdges(edges),
      selectedEdgeId,
      rootNodeCodes: new Set(rootNodeCodes),
      removedNodeCodes: new Set(removedNodeCodes),
      customPositions: deepCloneValue(customPositions) || {},
      laneLayout: { ...laneLayout },
    };
    const optimisticEdges = cloneEdges(nextEdges);
    const optimisticSelectedEdgeId = options.selectedEdgeId ?? selectedEdgeId;
    const optimisticRoots = new Set(options.rootNodeCodes ?? rootNodeCodes);
    const optimisticRemoved = new Set(options.removedNodeCodes ?? removedNodeCodes);
    const optimisticPositions = options.customPositions ?? customPositions;
    const optimisticLaneLayout = options.laneLayout ?? laneLayout;

    setSaving(true);
    setSaveError('');
    setToastMessage('');
    setEdges(optimisticEdges);
    setRootNodeCodes(optimisticRoots);
    setRemovedNodeCodes(optimisticRemoved);
    setCustomPositions(optimisticPositions);
    setLaneLayout(optimisticLaneLayout);
    if (optimisticSelectedEdgeId !== undefined) setSelectedEdgeId(optimisticSelectedEdgeId);

    try {
      const bundleOnlyEdges = optimisticEdges
        .filter((item) => item.lane === 'bundle')
        .map(({ id, ...rest }) => rest);
      const serviceMappingFromEdges = buildServiceMappingFromEdges(optimisticEdges);
      const response = await fetch(`/api/catalogs/${catalogSlug}/hierarchy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: bundleOnlyEdges,
          serviceMapping: serviceMappingFromEdges,
          visualState: {
            rootNodeCodes: [...optimisticRoots],
            removedNodeCodes: [...optimisticRemoved],
            customPositions: optimisticPositions,
            laneLayout: optimisticLaneLayout,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to persist the hierarchy graph.');
      }

      const persistedBundleEdges = (payload.items || []).map(normalizeEdge);
      const persistedServiceResourceEdges = buildEdgesFromServiceMapping(payload.serviceMapping || payload.item?.serviceMapping || serviceMappingFromEdges);
      const confirmedEdges = cloneEdges([...persistedBundleEdges, ...persistedServiceResourceEdges]);
      setEdges(confirmedEdges);
      if (!confirmedEdges.find((item) => item.id === optimisticSelectedEdgeId)) setSelectedEdgeId(confirmedEdges[0]?.id || '');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSaveError(message);
      setToastTone('error');
      setToastMessage(`Saved locally, but backend persistence failed: ${message}`);
      return true;
    } finally {
      setSaving(false);
    }
  }

  function syncSelectedNode(code) {
    setSelectedNodeId(code);
    const firstRelatedEdge = edges.find((edge) => edge.parent === code || edge.child === code);
    if (firstRelatedEdge) setSelectedEdgeId(firstRelatedEdge.id);
  }

  function getValidParentOptions(childCode, { includeRoot = true } = {}) {
    const childNode = nodeIndex.get(childCode);
    if (!childNode) return [];

    const activeParents = nodes.filter((node) => node.code !== childCode);
    const candidateParents = activeParents.filter((node) => {
      if (childNode.type === 'product') return node.type === 'product';
      if (childNode.type === 'service') return node.type === 'product';
      if (childNode.type === 'resource') return node.type === 'service';
      return false;
    });

    const safeParents = candidateParents.filter((node) => {
      if (childNode.type !== 'product') return true;
      const withoutCurrentIncoming = bundleEdges.filter((edge) => edge.child !== childCode);
      return !wouldCreateCycle(withoutCurrentIncoming, node.code, childCode);
    });

    return [
      ...(includeRoot && childNode.type === 'product' ? [{ code: '__root__', name: 'Root level / no parent', type: 'root' }] : []),
      ...safeParents.map((node) => ({ code: node.code, name: node.label, type: node.type })),
    ];
  }

  function getDefaultParentForChild(childCode, preferredParent = '') {
    const validParents = getValidParentOptions(childCode);
    if (!validParents.length) return '';
    if (preferredParent && validParents.some((item) => item.code === preferredParent)) return preferredParent;

    const childNode = nodeIndex.get(childCode);
    if (childNode?.type === 'product') {
      const selectedIsValid = selectedNodeId && validParents.some((item) => item.code === selectedNodeId);
      return selectedIsValid ? selectedNodeId : '__root__';
    }

    const selectedIsValid = selectedNodeId && validParents.some((item) => item.code === selectedNodeId);
    return selectedIsValid ? selectedNodeId : validParents[0]?.code || '';
  }

  function updateRelationModalChild(nextChild) {
    setRelationModal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        child: nextChild,
        parent: getDefaultParentForChild(nextChild, prev.parent),
      };
    });
  }

  async function applyRelationshipChange(parent, child, options = draft) {
    const normalizedParent = parent === '__root__' ? '' : parent;
    if (!child) {
      setSaveError('Choose a child node before saving the relationship.');
      return false;
    }

    const childNode = nodeIndex.get(child);
    if (!childNode) {
      setSaveError('The selected child node does not exist in the catalog definition set.');
      return false;
    }

    const previousRoots = new Set(rootNodeCodes);
    const previousRemoved = new Set(removedNodeCodes);

    if (!normalizedParent) {
      if (childNode.type !== 'product') {
        setSaveError('Choose a valid parent before creating a service or resource relationship.');
        return false;
      }
      const nextEdges = cloneEdges(edges.filter((edge) => edge.child !== child));
      const nextRoots = new Set(rootNodeCodes);
      nextRoots.add(child);
      const nextRemoved = new Set(removedNodeCodes);
      nextRemoved.delete(child);
      setRootNodeCodes(nextRoots);
      setRemovedNodeCodes(nextRemoved);
      const saved = await persist(nextEdges, { selectedEdgeId: nextEdges[0]?.id || '', rootNodeCodes: nextRoots, removedNodeCodes: nextRemoved, customPositions: options.customPositions || customPositions });
      if (!saved) {
        setRootNodeCodes(previousRoots);
        setRemovedNodeCodes(previousRemoved);
        return false;
      }
      setSelectedNodeId(child);
      setToastTone('success');
      setToastMessage('Node moved to root level.');
      return true;
    }

    if (normalizedParent === child) {
      setSaveError('A node cannot be linked to itself.');
      return false;
    }

    const parentNode = nodeIndex.get(normalizedParent);
    const lane = laneForNodeTypes(parentNode?.type, childNode.type);
    if (!lane) {
      setSaveError('Unsupported hierarchy relation type. Allowed: product→product, product→service, service→resource.');
      return false;
    }

    const edgesWithoutCurrentIncoming = edges.filter((edge) => edge.child !== child);
    if (lane === 'bundle' && wouldCreateCycle(edgesWithoutCurrentIncoming.filter((edge) => edge.lane === 'bundle'), normalizedParent, child)) {
      setSaveError('That relationship would create a circular bundle reference. Choose another parent.');
      return false;
    }

    const nextEdge = normalizeEdge({
      parent: normalizedParent,
      child,
      min: options.min,
      max: options.max,
      defaultQty: options.defaultQty,
      lane,
    });
    const nextEdges = cloneEdges([...edgesWithoutCurrentIncoming, nextEdge]);
    const nextRoots = new Set(rootNodeCodes);
    nextRoots.delete(child);
    const nextRemoved = new Set(removedNodeCodes);
    nextRemoved.delete(child);
    setRootNodeCodes(nextRoots);
    setRemovedNodeCodes(nextRemoved);

    const saved = await persist(nextEdges, { selectedEdgeId: nextEdge.id, rootNodeCodes: nextRoots, removedNodeCodes: nextRemoved, customPositions: options.customPositions || customPositions });
    if (!saved) {
      setRootNodeCodes(previousRoots);
      setRemovedNodeCodes(previousRemoved);
      return false;
    }

    setSelectedNodeId(child);
    setToastTone('success');
    setToastMessage('Relationship saved.');
    return true;
  }

  async function addBundleEdge(parent, child, options = draft) {
    return applyRelationshipChange(parent, child, options);
  }

  async function updateSelectedBundleEdge() {
    if (!selectedEdge) return false;
    return applyRelationshipChange(draft.parent, draft.child, draft);
  }

  async function removeEdge() {
    if (!deleteTarget?.edge) return;
    const edgeToRemove = deleteTarget.edge;
    const previousRoots = new Set(rootNodeCodes);
    const nextEdges = cloneEdges(edges.filter((item) => item.id !== edgeToRemove.id));
    const stillHasIncoming = nextEdges.some((edge) => edge.child === edgeToRemove.child);
    const nextRoots = new Set(rootNodeCodes);
    if (!stillHasIncoming) nextRoots.add(edgeToRemove.child);
    setRootNodeCodes(nextRoots);
    const saved = await persist(nextEdges, { selectedEdgeId: nextEdges[0]?.id || '', rootNodeCodes: nextRoots });
    if (!saved) setRootNodeCodes(previousRoots);
    if (saved) {
      setDeleteTarget(null);
      setToastTone('success');
      setToastMessage('Relationship removed and child node kept at root level.');
    }
  }

  async function removeNodeFromStructure() {
    if (!deleteTarget?.node) return;
    const targetCode = deleteTarget.node.code;
    const previousRoots = new Set(rootNodeCodes);
    const previousRemoved = new Set(removedNodeCodes);
    const previousPositions = deepCloneValue(customPositions) || {};
    const removedCodes = collectDescendantCodes(edges, targetCode);
    removedCodes.add(targetCode);

    const nextEdges = cloneEdges(edges.filter((edge) => !removedCodes.has(edge.parent) && !removedCodes.has(edge.child)));
    const nextRoots = new Set([...rootNodeCodes].filter((code) => !removedCodes.has(code)));
    const nextRemoved = new Set([...removedNodeCodes, ...removedCodes]);
    const nextPositions = Object.fromEntries(
      Object.entries(customPositions).filter(([code]) => !removedCodes.has(code)),
    );

    setRootNodeCodes(nextRoots);
    setRemovedNodeCodes(nextRemoved);
    setCustomPositions(nextPositions);

    const saved = await persist(nextEdges, { selectedEdgeId: nextEdges[0]?.id || '', rootNodeCodes: nextRoots, removedNodeCodes: nextRemoved, customPositions: nextPositions });
    if (!saved) {
      setRootNodeCodes(previousRoots);
      setRemovedNodeCodes(previousRemoved);
      setCustomPositions(previousPositions);
      return;
    }

    if (removedCodes.has(selectedNodeId)) setSelectedNodeId(nextEdges[0]?.parent || '');
    setDeleteTarget(null);
    setToastTone('success');
    setToastMessage(`Removed ${removedCodes.size} node${removedCodes.size === 1 ? '' : 's'} from the visual hierarchy.`);
  }

  function resetToDefault() {
    void persist(initialGraphEdges, { selectedEdgeId: initialGraphEdges[0]?.id || '', rootNodeCodes: buildInitialRootNodeCodes(initialGraphEdges, productSpecsState), removedNodeCodes: new Set(), customPositions: {}, laneLayout: DEFAULT_LANE_LAYOUT });
    setRootNodeCodes(buildInitialRootNodeCodes(initialGraphEdges, productSpecsState));
    setRemovedNodeCodes(new Set());
    setCustomPositions({});
    setLaneLayout(DEFAULT_LANE_LAYOUT);
  }

  function handleNodePointerDown(event, node) {
    if (!stageRef.current) return;
    if (event.target.closest('[data-node-action]')) return;

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
      boundsWidth: Math.max(logicalBounds.width, CANVAS_WIDTH * 2),
      boundsHeight: Math.max(logicalBounds.height, CANVAS_HEIGHT * 2),
    };
  }

  function handleLanePointerDown(event, key) {
    event.preventDefault();
    event.stopPropagation();
    laneDragRef.current = {
      key,
      startClientX: event.clientX,
      startValue: laneLayout[key],
      scale: fitScale || 1,
    };
  }

  function openRelationBuilder(overrides = {}) {
    const child = overrides.child || '';
    const parent = child ? getDefaultParentForChild(child, overrides.parent || '') : '';

    setRelationModal({
      parent,
      child,
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
    setIsCanvasDropActive(false);
  }

  function handlePaletteDragStart(event, code) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/upc-product-code', code);
  }

  function openDropModalFromEvent(event, parentCode = '') {
    event.preventDefault();
    event.stopPropagation();
    setIsCanvasDropActive(false);
    const draggedCode = event.dataTransfer.getData('text/upc-product-code');
    if (!draggedCode) return;
    if (parentCode && parentCode === draggedCode) {
      setSaveError('A node cannot be dropped onto itself.');
      return;
    }

    let dropPoint = { targetX: null, targetY: null };
    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const localX = (event.clientX - rect.left) / fitScale;
      const localY = (event.clientY - rect.top) / fitScale;
      dropPoint = {
        targetX: Math.max(0, localX - PRODUCT_NODE_WIDTH * 0.2),
        targetY: Math.max(0, localY - PRODUCT_NODE_HEIGHT * 0.5),
      };
    }

    openRelationBuilder({
      parent: parentCode || '',
      child: draggedCode,
      source: parentCode ? 'node-drop' : 'canvas-drop',
      prelinkedTarget: parentCode,
      ...dropPoint,
    });
  }

  async function submitRelationBuilder() {
    if (!relationModal) return;
    const previousPositions = deepCloneValue(customPositions) || {};

    const nextPositions = Number.isFinite(Number(relationModal.targetX)) && Number.isFinite(Number(relationModal.targetY))
      ? {
        ...customPositions,
        [relationModal.child]: {
          x: relationModal.targetX,
          y: relationModal.targetY,
        },
      }
      : customPositions;

    if (nextPositions !== customPositions) {
      setCustomPositions(nextPositions);
    }

    const saved = await applyRelationshipChange(relationModal.parent, relationModal.child, {
      ...relationModal,
      customPositions: nextPositions,
      laneLayout,
    });
    if (saved) {
      closeRelationBuilder();
      return;
    }
    setCustomPositions(previousPositions);
  }

  function openRelationshipManager(event, node) {
    event.stopPropagation();
    const incoming = getIncomingEdges(edges, node.code)[0];
    setRelationshipManager({
      nodeCode: node.code,
      nodeLabel: node.label,
      parent: incoming?.parent || '__root__',
      min: incoming?.min ?? 0,
      max: incoming?.max ?? 1,
      defaultQty: incoming?.defaultQty ?? 0,
    });
  }

  function closeRelationshipManager() {
    setRelationshipManager(null);
  }

  async function submitRelationshipManager() {
    if (!relationshipManager) return;
    const saved = await applyRelationshipChange(
      relationshipManager.parent,
      relationshipManager.nodeCode,
      relationshipManager,
    );
    if (saved) closeRelationshipManager();
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

  async function persistEntities(nextPayload) {
    const response = await fetch(`/api/catalogs/${catalogSlug}/entities`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextPayload),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'Entity persistence failed.');
    }
  }

  async function submitEntityDraft() {
    const normalizedCode = toCode(entityDraft.code || entityDraft.name, entityDraft.type.toUpperCase());
    if (!entityDraft.name.trim()) {
      setSaveError('Entity name is required.');
      return;
    }
    const record = {
      code: normalizedCode,
      name: entityDraft.name.trim(),
      summary: entityDraft.summary.trim(),
      category: entityDraft.category.trim(),
    };
    try {
      if (entityDraft.type === 'product') {
        const next = [...productSpecsState.filter((item) => item.code !== normalizedCode), record];
        setProductSpecsState(next);
        await persistEntities({ productSpecifications: next });
      } else if (entityDraft.type === 'service') {
        const next = [...serviceSpecsState.filter((item) => item.code !== normalizedCode), record];
        setServiceSpecsState(next);
        await persistEntities({ serviceSpecifications: next });
      } else {
        const next = [...resourceSpecsState.filter((item) => item.code !== normalizedCode), record];
        setResourceSpecsState(next);
        await persistEntities({ resourceSpecifications: next });
      }
      setToastTone('success');
      setToastMessage('Entity saved in catalog.');
      setEntityDraft((prev) => ({ ...prev, code: '', name: '', summary: '' }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    }
  }

  async function addCatalogGroup() {
    if (!entityDraft.category.trim()) return;
    const next = [...new Set([...categoryState, entityDraft.category.trim()])];
    setCategoryState(next);
    await persistEntities({ catalogCategories: next, offeringCategories: offeringCategoryState });
    setToastTone('success');
    setToastMessage('Catalog group saved.');
  }

  return (
    <div className={styles.wrapper}>
      {saveError ? <p className={cx('ds-field__error', styles.fullBleed)}>{saveError}</p> : null}
      {toastMessage ? (
        <div className={cx(styles.toastNotice, styles.fullBleed)} data-tone={toastTone} role="status">
          {toastMessage}
          <button type="button" onClick={() => setToastMessage('')} aria-label="Dismiss rollback notice">×</button>
        </div>
      ) : null}

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
          <Card title="Entity editor" description="Create and edit product, service, and resource entities directly in this catalog, then assign grouping labels." padding="md">
            <div className={styles.controlStack}>
              <label className={styles.filterField}>
                <span>Entity type</span>
                <select value={entityDraft.type} onChange={(event) => setEntityDraft((prev) => ({ ...prev, type: event.target.value }))}>
                  <option value="product">Product specification</option>
                  <option value="service">Service specification</option>
                  <option value="resource">Resource specification</option>
                </select>
              </label>
              <Input label="Code (optional)" value={entityDraft.code} onChange={(event) => setEntityDraft((prev) => ({ ...prev, code: event.target.value }))} />
              <Input label="Name" value={entityDraft.name} onChange={(event) => setEntityDraft((prev) => ({ ...prev, name: event.target.value }))} />
              <Input label="Summary / description" value={entityDraft.summary} onChange={(event) => setEntityDraft((prev) => ({ ...prev, summary: event.target.value }))} />
              <Input label="Group / category" value={entityDraft.category} onChange={(event) => setEntityDraft((prev) => ({ ...prev, category: event.target.value }))} />
              <div className={styles.inlineActions}>
                <Button onClick={submitEntityDraft}>Save entity</Button>
                <Button variant="secondary" onClick={addCatalogGroup}>Save group</Button>
              </div>
              <span className={styles.mutedText}>Groups: {(categoryState || []).join(', ') || 'No groups defined yet.'}</span>
            </div>
          </Card>

          <Card
            title="Structure palette"
            description="Drag a product, service or resource into the visual studio below. A relation builder dialog lets you choose the parent, child and bundle cardinality before saving."
            padding="md"
          >
            <div className={styles.paletteAccordion}>
              {paletteGroups.map((group) => {
                const isOpen = Boolean(openPaletteSections[group.key]);
                return (
                  <section key={group.key} className={styles.paletteSection}>
                    <button
                      type="button"
                      className={styles.paletteSectionHeader}
                      aria-expanded={isOpen}
                      onClick={() => setOpenPaletteSections((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                    >
                      <span>{group.label}</span>
                      <span className={styles.paletteSectionBadge}>
                        <span>{group.key}</span>
                        <strong>{group.items.length}</strong>
                      </span>
                    </button>
                    {isOpen ? (
                      <div className={cx(styles.paletteList, group.tone)}>
                        {group.items.map((item) => (
                          <button
                            key={`${group.key}-${item.code}`}
                            type="button"
                            className={cx(styles.paletteItem, selectedNodeId === item.code && styles.paletteItemActive)}
                            draggable={group.draggable}
                            onDragStart={group.draggable ? (event) => handlePaletteDragStart(event, item.code) : undefined}
                            onClick={() => { if (group.draggable) syncSelectedNode(item.code); }}
                          >
                            <div className={styles.paletteItemTop}>
                              <span className={styles.paletteItemCode}>{item.code}</span>
                              <span className={styles.paletteBadge}>{item.type}</span>
                              {item.type === 'characteristic' ? (
                                <span className={styles.paletteBadge}>applies {item.appliesTo}</span>
                              ) : (
                                <span className={styles.paletteBadge}>{item.characteristicCount} char</span>
                              )}
                            </div>
                            <strong>{item.label}</strong>
                            <span className={styles.paletteMeta}>
                              {item.type === 'characteristic' ? `Mapped to ${item.appliesTo}` : `Parents ${item.incoming} · Children ${item.outgoing}`}
                            </span>
                          </button>
                        ))}
                        {group.items.length === 0 ? <p className={styles.mutedText}>No {group.label.toLowerCase()} available in this catalog.</p> : null}
                      </div>
                    ) : null}
                  </section>
                );
              })}
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
                        <Button variant="danger" onClick={() => { const childNode = nodeLookup.get(selectedEdge.child); if (childNode) setDeleteTarget({ kind: 'node', node: childNode, incomingEdge: selectedEdge }); }}>Remove child from structure</Button>
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
                  <span>Parent node</span>
                  <select value={draft.parent} onChange={(event) => setDraft((prev) => ({ ...prev, parent: event.target.value }))}>
                    {[...productSpecsState, ...serviceSpecsState].map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}
                  </select>
                </label>
                <label className={styles.filterField}>
                  <span>Child node</span>
                  <select value={draft.child} onChange={(event) => setDraft((prev) => ({ ...prev, child: event.target.value }))}>
                    <option value="">Select child…</option>
                    {[...productSpecsState, ...serviceSpecsState, ...resourceSpecsState].map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}
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
        className={styles.canvasCard}
        title="Visual hierarchy studio"
        description="The full product → service → resource structure is rendered below in one connected graph. Drag nodes to rearrange the layout, drag palette items into the stage to open a relation builder, drop onto highlighted nodes or the canvas, manage parents with the cog action, and remove complete subtrees with the minus action."
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
            className={cx(styles.canvasSurfaceFull, isCanvasDropActive && styles.canvasSurfaceDropActive)}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsCanvasDropActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
              setIsCanvasDropActive(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsCanvasDropActive(false);
            }}
            onDrop={(event) => openDropModalFromEvent(event)}
            style={{
              minHeight: `${stageHeight}px`,
              '--studio-product-lane-left': `${laneLayout.productX}px`,
              '--studio-service-lane-left': `${laneLayout.serviceX}px`,
              '--studio-resource-lane-left': `${laneLayout.resourceX}px`,
            }}
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

              <button type="button" className={styles.laneLabel} style={{ left: `${laneLayout.productX}px` }} onPointerDown={(event) => handleLanePointerDown(event, 'productX')}>Products</button>
              <button type="button" className={styles.laneLabel} style={{ left: `${laneLayout.serviceX}px` }} onPointerDown={(event) => handleLanePointerDown(event, 'serviceX')}>Services</button>
              <button type="button" className={styles.laneLabel} style={{ left: `${laneLayout.resourceX}px` }} onPointerDown={(event) => handleLanePointerDown(event, 'resourceX')}>Resources</button>

              {nodes.map((node) => {
                const incomingEdge = getIncomingEdges(edges, node.code)[0] || null;
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
                      if (node.type === 'resource') return;
                      event.preventDefault();
                      setHoveredDropTarget(node.code);
                    }}
                    onDragLeave={() => setHoveredDropTarget('')}
                    onDrop={(event) => {
                      if (node.type === 'resource') return;
                      setHoveredDropTarget('');
                      openDropModalFromEvent(event, node.code);
                    }}
                  >
                    <div className={styles.nodeActionBar} data-node-action="bar">
                      <button
                        type="button"
                        data-node-action="remove"
                        className={styles.nodeActionButtonDanger}
                        aria-label={`Completely remove ${node.label} from the structure`}
                        title="Remove from structure"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget({ kind: 'node', node, incomingEdge });
                        }}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        data-node-action="settings"
                        className={styles.nodeActionButton}
                        aria-label={`Manage relationship for ${node.label}`}
                        title="Manage relationship"
                        onClick={(event) => openRelationshipManager(event, node)}
                      >
                        ⚙
                      </button>
                    </div>
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
        title={deleteTarget?.kind === 'node' ? 'Remove element from structure' : 'Delete hierarchy relationship'}
        description={deleteTarget?.kind === 'node'
          ? 'Are you sure you want to completely remove this element from the structure? This action will detach it and remove its associated characteristics from the hierarchy.'
          : 'This removes the selected relationship from the persisted hierarchy graph and keeps the child as a root-level node.'}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            {deleteTarget?.kind === 'node' ? (
              <Button variant="danger" onClick={removeNodeFromStructure} loading={saving}>Remove</Button>
            ) : (
              <Button variant="danger" onClick={removeEdge} loading={saving}>Delete edge</Button>
            )}
          </>
        )}
      >
        {deleteTarget?.kind === 'node' ? (
          <div className={styles.relationModalBody}>
            <p>
              Remove <strong>{deleteTarget.node.label}</strong> (<code>{deleteTarget.node.code}</code>) from <strong>{catalogTitle}</strong>?
            </p>
            <p className={styles.mutedText}>
              Descendant nodes are removed from the canvas as well to prevent orphan branches. Catalog definitions remain in the palette, so the element can be added again later.
            </p>
          </div>
        ) : null}
        {deleteTarget?.kind === 'edge' ? (
          <p>
            Remove <code>{deleteTarget.edge.parent}</code> → <code>{deleteTarget.edge.child}</code> from <strong>{catalogTitle}</strong>?
          </p>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(relationModal)}
        onClose={closeRelationBuilder}
        title="Create relationship"
        description="Choose the parent, child and cardinality before the relationship is added to the visual hierarchy. The child will be re-parented immutably if it already exists in another branch."
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
              <span>Parent node</span>
              <select value={relationModal.parent} onChange={(event) => setRelationModal((prev) => ({ ...prev, parent: event.target.value }))}>
                {getValidParentOptions(relationModal.child).map((item) => (
                  <option value={item.code} key={item.code}>{item.code === '__root__' ? item.name : `${item.code} · ${item.name}`}</option>
                ))}
              </select>
            </label>
            <label className={styles.filterField}>
              <span>Child node</span>
              <select value={relationModal.child} onChange={(event) => updateRelationModalChild(event.target.value)}>
                <option value="">Select child…</option>
                {[...productSpecsState, ...serviceSpecsState, ...resourceSpecsState].map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}
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

      <Modal
        open={Boolean(relationshipManager)}
        onClose={closeRelationshipManager}
        title="Manage node relationship"
        description="Move the selected node to root level or re-parent it to another valid node without creating circular TMF620 bundle references."
        actions={(
          <>
            <Button variant="ghost" onClick={closeRelationshipManager}>Cancel</Button>
            <Button onClick={submitRelationshipManager} loading={saving}>Save relationship</Button>
          </>
        )}
      >
        {relationshipManager ? (
          <div className={styles.relationModalBody}>
            <div className={styles.relationHero}>
              <strong>{relationshipManager.nodeLabel}</strong>
              <code>{relationshipManager.nodeCode}</code>
            </div>
            <label className={styles.filterField}>
              <span>Parent node</span>
              <select value={relationshipManager.parent} onChange={(event) => setRelationshipManager((prev) => ({ ...prev, parent: event.target.value }))}>
                {getValidParentOptions(relationshipManager.nodeCode).map((item) => (
                  <option value={item.code} key={item.code}>{item.code === '__root__' ? item.name : `${item.code} · ${item.name}`}</option>
                ))}
              </select>
            </label>
            <div className={styles.compactGrid}>
              <Input label="Min" type="number" value={relationshipManager.min} onChange={(event) => setRelationshipManager((prev) => ({ ...prev, min: event.target.value }))} />
              <Input label="Max" type="number" value={relationshipManager.max} onChange={(event) => setRelationshipManager((prev) => ({ ...prev, max: event.target.value }))} />
              <Input label="Default qty" type="number" value={relationshipManager.defaultQty} onChange={(event) => setRelationshipManager((prev) => ({ ...prev, defaultQty: event.target.value }))} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
