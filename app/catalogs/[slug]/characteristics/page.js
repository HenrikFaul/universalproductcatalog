import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveCatalogBySlug } from '../../../lib/catalogPersistence';
import CharacteristicsManagerClient from './CharacteristicsManagerClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const catalog = await resolveCatalogBySlug(slug);
  if (!catalog) {
    return { title: 'Characteristic manager | Universal Product Catalog' };
  }
  return { title: `Characteristics · ${catalog.title} | Universal Product Catalog` };
}

export default async function CatalogCharacteristicsPage({ params }) {
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
        <span>Characteristics</span>
      </nav>

      <section className="hero compact-hero">
        <p className="eyebrow">Characteristic manager</p>
        <h1 className="section-title">{catalog.title}</h1>
        <p className="hero-text">
          Create, edit and safely delete universal product characteristics. Changes are now prepared to persist to the configured Supabase backend.
        </p>
      </section>

      <nav className="catalog-local-tabs" aria-label="Catalog sections">
        <Link href={`/catalogs/${catalog.slug}`} className="catalog-local-tab">Overview</Link>
        <Link href={`/catalogs/${catalog.slug}/entities`} className="catalog-local-tab">Entities</Link>
        <Link href={`/catalogs/${catalog.slug}/hierarchy`} className="catalog-local-tab">Hierarchy Studio</Link>
        <Link href={`/catalogs/${catalog.slug}/characteristics`} className="catalog-local-tab active">Characteristics</Link>
      </nav>

      <CharacteristicsManagerClient
        catalogSlug={catalog.slug}
        catalogTitle={catalog.title}
        seedDefinitions={catalog.characteristicDefinitions}
        productSpecifications={catalog.productSpecifications}
        serviceSpecifications={catalog.serviceSpecifications}
        resourceSpecifications={catalog.resourceSpecifications}
      />
    </main>
  );
}
