import Link from 'next/link';
import { getCatalogTemplates } from '../lib/catalogData';
import { getPersistenceDiagnostics, resolveCatalogsForIndex } from '../lib/catalogPersistence';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Catalogs | Universal Product Catalog',
};

export default async function CatalogsPage() {
  const templates = getCatalogTemplates();
  const { persisted, demoCatalogs } = await resolveCatalogsForIndex();
  const diagnostics = getPersistenceDiagnostics();

  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <p className="eyebrow">Catalogs</p>
        <h1 className="section-title">Product catalogs, starter structures and builder</h1>
        <p className="hero-text">
          Here you can open the telecom demo catalog, browse persisted custom catalogs and start from one of twenty cross-industry starter templates.
        </p>
        <div className="hero-actions">
          <Link href="/catalogs/new" className="primary-button">Create new catalog</Link>
        </div>
        <p className="helper-text">
          Persistence target: <code>{diagnostics.supabaseUrl}</code>
          {' · '}
          {diagnostics.persistenceEnabled ? 'Supabase write access detected' : 'No service-role backend wiring detected yet'}
        </p>
      </section>

      {persisted.length ? (
        <section className="section-block">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Persisted catalogs</p>
              <h2>Catalogs stored in Supabase</h2>
            </div>
          </div>
          <div className="list-grid">
            {persisted.map((catalog) => (
              <Link href={`/catalogs/${catalog.slug}`} className="card interactive-card list-card" key={catalog.slug}>
                <div className="card-topline">
                  <h3>{catalog.title}</h3>
                  <span className="status-pill">{catalog.industry}</span>
                </div>
                <p>{catalog.description}</p>
                <div className="tag-row">
                  <span className="tag">{catalog.productSpecifications.length} product specs</span>
                  <span className="tag">{catalog.productOfferings.length} offerings</span>
                  <span className="tag">{catalog.characteristicDefinitions.length} characteristics</span>
                </div>
                <span className="text-link">Open persisted catalog →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Demo</p>
            <h2>Ready-made demo catalogs</h2>
          </div>
        </div>
        <div className="list-grid">
          {demoCatalogs.map((catalog) => (
            <Link href={`/catalogs/${catalog.slug}`} className="card interactive-card list-card" key={catalog.slug}>
              <div className="card-topline">
                <h3>{catalog.title}</h3>
                <span className="status-pill">{catalog.industry}</span>
              </div>
              <p>{catalog.description}</p>
              <div className="tag-row">
                <span className="tag">{catalog.productSpecifications.length} product specs</span>
                <span className="tag">{catalog.productOfferings.length} offerings</span>
                <span className="tag">{catalog.characteristicDefinitions.length} characteristics</span>
              </div>
              <span className="text-link">Open demo catalog →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Starter templates</p>
            <h2>Twenty industries you can start from</h2>
          </div>
          <Link href="/catalogs/new" className="secondary-button compact-button">Open builder</Link>
        </div>
        <div className="list-grid">
          {templates.map((template) => (
            <Link href={`/catalogs/new?industry=${template.slug}`} className="card interactive-card list-card" key={template.slug}>
              <div className="card-topline">
                <h3>{template.title}</h3>
                <span className="status-pill">Template</span>
              </div>
              <p>{template.focus}</p>
              <div className="tag-row">
                {template.starterProducts.slice(0, 3).map((item) => (
                  <span className="tag" key={item}>{item}</span>
                ))}
              </div>
              <span className="text-link">Use template →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
