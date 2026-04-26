import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDemoCatalogBySlug, getDemoCatalogs } from '../../../lib/catalogData';
import CharacteristicsManagerClient from './CharacteristicsManagerClient';

export function generateStaticParams() {
  return getDemoCatalogs().map((catalog) => ({ slug: catalog.slug }));
}

export function generateMetadata({ params }) {
  const catalog = getDemoCatalogBySlug(params.slug);
  if (!catalog) {
    return { title: 'Characteristic manager | Universal Product Catalog' };
  }
  return { title: `Characteristics · ${catalog.title} | Universal Product Catalog` };
}

export default function CatalogCharacteristicsPage({ params }) {
  const catalog = getDemoCatalogBySlug(params.slug);
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
          Create, edit and safely delete universal product characteristics without touching the
          existing backend model. This manager uses the current TMF620-aligned demo catalog as seed data.
        </p>
        <div className="hero-actions">
          <Link href={`/catalogs/${catalog.slug}`} className="secondary-button">Back to catalog</Link>
          <Link href="/catalogs/new?industry=telecommunications" className="secondary-button">Clone new catalog</Link>
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
