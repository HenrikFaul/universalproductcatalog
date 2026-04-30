import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveCatalogBySlug } from '../../../lib/catalogPersistence';
import EntityManagementClient from './EntityManagementClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const catalog = await resolveCatalogBySlug(slug);
  if (!catalog) {
    return { title: 'Entity manager | Universal Product Catalog' };
  }
  return { title: `Entities · ${catalog.title} | Universal Product Catalog` };
}

export default async function CatalogEntitiesPage({ params }) {
  const { slug } = await params;
  const catalog = await resolveCatalogBySlug(slug);
  if (!catalog) notFound();

  return (
    <main className="page-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span> / </span>
        <Link href="/catalogs">Catalogs</Link>
        <span> / </span>
        <Link href={`/catalogs/${catalog.slug}`}>{catalog.title}</Link>
        <span> / </span>
        <span>Entities</span>
      </nav>

      <section className="hero compact-hero">
        <p className="eyebrow">Catalog entity manager</p>
        <h1 className="section-title">{catalog.title}</h1>
        <p className="hero-text">
          Add, edit and remove Product Specification, Product Offering and Product inventory records on an already-created catalog without rebuilding the catalog from scratch.
        </p>
      </section>

      <nav className="catalog-local-tabs" aria-label="Catalog sections">
        <Link href={`/catalogs/${catalog.slug}`} className="catalog-local-tab">Overview</Link>
        <Link href={`/catalogs/${catalog.slug}/entities`} className="catalog-local-tab active">Entities</Link>
        <Link href={`/catalogs/${catalog.slug}/hierarchy`} className="catalog-local-tab">Hierarchy Studio</Link>
        <Link href={`/catalogs/${catalog.slug}/characteristics`} className="catalog-local-tab">Characteristics</Link>
      </nav>

      <EntityManagementClient
        catalogSlug={catalog.slug}
        catalogTitle={catalog.title}
        initialProductSpecifications={catalog.productSpecifications || []}
        initialProductOfferings={catalog.productOfferings || []}
        initialProducts={catalog.productInventory || []}
      />
    </main>
  );
}
