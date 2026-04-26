import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveCatalogBySlug } from '../../../lib/catalogPersistence';
import HierarchyBuilderClient from './HierarchyBuilderClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const catalog = await resolveCatalogBySlug(slug);
  if (!catalog) {
    return { title: 'Hierarchy builder | Universal Product Catalog' };
  }
  return { title: `Hierarchy · ${catalog.title} | Universal Product Catalog` };
}

export default async function CatalogHierarchyPage({ params }) {
  const { slug } = await params;
  const catalog = await resolveCatalogBySlug(slug);
  if (!catalog) notFound();

  return (
    <main className="page-shell hierarchy-page-shell">
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
        <h1 className="section-title">{catalog.title}</h1>
        <p className="hero-text">
          Visualise and edit the Bundle → Product → Service → Resource structure in a TMF620-friendly way. The builder saves relationship edges to the configured Supabase backend when server credentials are present.
        </p>
      </section>

      <nav className="catalog-local-tabs" aria-label="Catalog sections">
        <Link href={`/catalogs/${catalog.slug}`} className="catalog-local-tab">Overview</Link>
        <Link href={`/catalogs/${catalog.slug}/hierarchy`} className="catalog-local-tab active">Hierarchy Studio</Link>
        <Link href={`/catalogs/${catalog.slug}/characteristics`} className="catalog-local-tab">Characteristics</Link>
      </nav>

      <HierarchyBuilderClient
        catalogSlug={catalog.slug}
        catalogTitle={catalog.title}
        initialHierarchy={catalog.hierarchy}
        productSpecifications={catalog.productSpecifications}
        serviceSpecifications={catalog.serviceSpecifications}
        resourceSpecifications={catalog.resourceSpecifications}
        serviceMapping={catalog.serviceMapping}
        characteristicDefinitions={catalog.characteristicDefinitions}
        initialStudioState={catalog.metadata?.hierarchyStudio || {}}
      />
    </main>
  );
}
