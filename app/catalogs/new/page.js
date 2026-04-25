import Link from 'next/link';
import CatalogBuilderClient from './CatalogBuilderClient';
import { getCatalogTemplates } from '../../lib/catalogData';

export const metadata = {
  title: 'Create catalog | Universal Product Catalog',
};

export default function NewCatalogPage({ searchParams }) {
  const templates = getCatalogTemplates();
  const initialSlug = typeof searchParams.industry === 'string' ? searchParams.industry : templates[0].slug;

  return (
    <main className="page-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span> / </span>
        <Link href="/catalogs">Catalogs</Link>
        <span> / </span>
        <span>Create new catalog</span>
      </nav>

      <section className="hero compact-hero">
        <p className="eyebrow">Catalog builder</p>
        <h1 className="section-title">Create a new universal product catalog</h1>
        <p className="hero-text">
          Choose one of twenty industries, start from a universal EPC/TMF620-aligned shell and tailor products, services, resources and characteristics.
        </p>
      </section>

      <CatalogBuilderClient templates={templates} initialSlug={initialSlug} />
    </main>
  );
}
