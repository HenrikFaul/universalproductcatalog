import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveCatalogBySlug } from '../../../lib/catalogPersistence';
import HierarchyBuilderClient from './HierarchyBuilderClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const catalog = await resolveCatalogBySlug(params.slug);
  if (!catalog) {
    return { title: 'Hierarchy builder | Universal Product Catalog' };
  }
  return { title: `Hierarchy · ${catalog.title} | Universal Product Catalog` };
}

export default async function CatalogHierarchyPage({ params }) {
  const catalog = await resolveCatalogBySlug(params.slug);
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
        <span>Hierarchy</span>
      </nav>

      <section className="hero compact-hero">
        <p className="eyebrow">Hierarchy builder</p>
        <h1 className="section-title">{catalog.title}</h1>
        <p className="hero-text">
          Visualise and edit the Bundle → Product → Service → Resource structure in a TMF620-friendly way. The builder saves relationship edges to the configured Supabase backend when server credentials are present.
        </p>
        <div className="hero-actions">
          <Link href={`/catalogs/${catalog.slug}`} className="secondary-button">Back to catalog</Link>
          <Link href={`/catalogs/${catalog.slug}/characteristics`} className="secondary-button">Manage characteristics</Link>
        </div>
      </section>

      <HierarchyBuilderClient
        catalogSlug={catalog.slug}
        catalogTitle={catalog.title}
        initialHierarchy={catalog.hierarchy}
        productSpecifications={catalog.productSpecifications}
        serviceSpecifications={catalog.serviceSpecifications}
        resourceSpecifications={catalog.resourceSpecifications}
        serviceMapping={catalog.serviceMapping}
        characteristicDefinitions={catalog.characteristicDefinitions}
      />
    </main>
  );
}
