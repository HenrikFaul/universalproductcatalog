import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDemoCatalogBySlug, getDemoCatalogs } from '../../../lib/catalogData';
import HierarchyBuilderClient from './HierarchyBuilderClient';

export function generateStaticParams() {
  return getDemoCatalogs().map((catalog) => ({ slug: catalog.slug }));
}

export function generateMetadata({ params }) {
  const catalog = getDemoCatalogBySlug(params.slug);
  if (!catalog) {
    return { title: 'Hierarchy not found | Universal Product Catalog' };
  }
  return { title: `${catalog.title} hierarchy | Universal Product Catalog` };
}

function buildNodeMap(catalog) {
  const specNodes = catalog.productSpecifications.map((item) => ({
    id: item.code,
    code: item.code,
    label: item.name,
    kind: 'product-spec',
    group: 'Product specifications',
    status: item.lifecycle,
    summary: item.summary,
    meta: item.businessModel,
  }));

  const serviceNodes = catalog.serviceSpecifications.map((item) => ({
    id: item.code,
    code: item.code,
    label: item.name,
    kind: 'service-spec',
    group: 'Service specifications',
    status: item.serviceType,
    summary: item.summary,
    meta: item.serviceType,
  }));

  const resourceNodes = catalog.resourceSpecifications.map((item) => ({
    id: item.code,
    code: item.code,
    label: item.name,
    kind: 'resource-spec',
    group: 'Resource specifications',
    status: item.resourceType,
    summary: item.summary,
    meta: item.resourceType,
  }));

  return [...specNodes, ...serviceNodes, ...resourceNodes];
}

function buildEdges(catalog) {
  const productEdges = catalog.hierarchy.map((edge) => ({
    id: `pc:${edge.parent}:${edge.child}`,
    source: edge.parent,
    target: edge.child,
    relationType: 'Product component',
    min: edge.min,
    max: edge.max,
    defaultQty: edge.defaultQty,
    lane: 'product',
  }));

  const serviceEdges = catalog.serviceMapping.flatMap((row) => {
    const result = [
      {
        id: `ps:${row.productSpec}:${row.serviceSpec}`,
        source: row.productSpec,
        target: row.serviceSpec,
        relationType: 'Product → Service',
        lane: 'decomposition',
      },
    ];

    for (const resource of row.resourceSpecs || []) {
      result.push({
        id: `sr:${row.serviceSpec}:${resource}`,
        source: row.serviceSpec,
        target: resource,
        relationType: 'Service → Resource',
        lane: 'decomposition',
      });
    }

    return result;
  });

  return [...productEdges, ...serviceEdges];
}

function buildOfferingLinks(catalog) {
  const map = {};
  for (const offering of catalog.productOfferings) {
    if (!map[offering.specificationCode]) {
      map[offering.specificationCode] = [];
    }
    map[offering.specificationCode].push({
      code: offering.code,
      name: offering.name,
      status: offering.status,
      priceSummary: offering.priceSummary,
    });
  }
  return map;
}

function buildCharacteristicCounts(catalog) {
  return catalog.characteristicDefinitions.reduce((acc, item) => {
    acc[item.appliesTo] = (acc[item.appliesTo] || 0) + 1;
    return acc;
  }, {});
}

export default function CatalogHierarchyPage({ params }) {
  const catalog = getDemoCatalogBySlug(params.slug);
  if (!catalog) notFound();

  return (
    <main className="page-shell catalog-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span> / </span>
        <Link href="/catalogs">Catalogs</Link>
        <span> / </span>
        <Link href={`/catalogs/${catalog.slug}`}>{catalog.title}</Link>
        <span> / </span>
        <span>Hierarchy</span>
      </nav>

      <section className="hero compact-hero">
        <p className="eyebrow">Hierarchy builder</p>
        <h1 className="section-title">{catalog.title} structure canvas</h1>
        <p className="hero-text">
          Visual TMF620-style structure view for product, service and resource layers. This is the
          presentation and interaction layer for bundle and decomposition relations.
        </p>
        <div className="hero-actions">
          <Link href={`/catalogs/${catalog.slug}`} className="secondary-button">Back to catalog</Link>
          <Link href={`/catalogs/${catalog.slug}/characteristics`} className="secondary-button">Open characteristics</Link>
        </div>
      </section>

      <HierarchyBuilderClient
        catalogSlug={catalog.slug}
        catalogTitle={catalog.title}
        nodes={buildNodeMap(catalog)}
        edges={buildEdges(catalog)}
        offeringMap={buildOfferingLinks(catalog)}
        characteristicCounts={buildCharacteristicCounts(catalog)}
      />
    </main>
  );
}
