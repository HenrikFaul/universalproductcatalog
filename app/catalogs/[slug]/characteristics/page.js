import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveCatalogBySlug } from '../../../lib/catalogPersistence';
import CharacteristicsManagerClient from './CharacteristicsManagerClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const catalog = await resolveCatalogBySlug(params.slug);
  if (!catalog) {
    return { title: 'Characteristic manager | Universal Product Catalog' };
  }
  return { title: `Characteristics · ${catalog.title} | Universal Product Catalog` };
}

export default async function CatalogCharacteristicsPage({ params }) {
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
        <span>Characteristics</span>
      </nav>

      <section className="hero compact-hero">
        <p className="eyebrow">Characteristic manager</p>
        <h1 className="section-title">{catalog.title}</h1>
        <p className="hero-text">
          Create, edit and safely delete universal product characteristics. Changes are now prepared to persist to the configured Supabase backend.
        </p>
        <div className="hero-actions">
          <Link href={`/catalogs/${catalog.slug}`} className="secondary-button">Back to catalog</Link>
          <Link href={`/catalogs/${catalog.slug}/hierarchy`} className="secondary-button">Open hierarchy builder</Link>
        </div>
      </section>

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
