import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveCatalogBySlug } from '../../lib/catalogPersistence';
import CloneCatalogButton from '../../../components/catalog/CloneCatalogButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const catalog = await resolveCatalogBySlug(slug);
  if (!catalog) {
    return { title: 'Catalog not found | Universal Product Catalog' };
  }
  return { title: `${catalog.title} | Universal Product Catalog` };
}

export default async function CatalogDetailsPage({ params }) {
  const { slug } = await params;
  const catalog = await resolveCatalogBySlug(slug);
  if (!catalog) notFound();

  return (
    <main className="page-shell catalog-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span> / </span>
        <Link href="/catalogs">Catalogs</Link>
        <span> / </span>
        <span>{catalog.title}</span>
      </nav>

      <section className="hero compact-hero">
        <p className="eyebrow">TMF620-style catalog</p>
        <h1 className="section-title">{catalog.title}</h1>
        <p className="hero-text">{catalog.description}</p>
        <div className="hero-actions">
          <CloneCatalogButton slug={catalog.slug} />
          <Link href={`/catalogs/${catalog.slug}/characteristics`} className="secondary-button">Manage characteristics</Link>
          <Link href={`/catalogs/${catalog.slug}/hierarchy`} className="secondary-button">Open hierarchy builder</Link>
          <Link href="/catalogs" className="secondary-button">Back to catalogs</Link>
        </div>
        <div className="tag-row">
          <span className="tag">{catalog.sourceKind || 'demo'}</span>
          <span className="tag">{catalog.industry}</span>
          <span className="tag">{catalog.tmfVersion}</span>
        </div>
      </section>

      <nav className="catalog-local-tabs" aria-label="Catalog sections">
        <Link href={`/catalogs/${catalog.slug}`} className="catalog-local-tab active">Overview</Link>
        <Link href={`/catalogs/${catalog.slug}/hierarchy`} className="catalog-local-tab">Hierarchy Studio</Link>
        <Link href={`/catalogs/${catalog.slug}/characteristics`} className="catalog-local-tab">Characteristics</Link>
      </nav>

      <section className="stats-grid catalog-stats">
        <article className="stat-card"><span className="stat-value">{catalog.productSpecifications.length}</span><span className="stat-label">Product specifications</span></article>
        <article className="stat-card"><span className="stat-value">{catalog.productOfferings.length}</span><span className="stat-label">Product offerings</span></article>
        <article className="stat-card"><span className="stat-value">{catalog.characteristicDefinitions.length}</span><span className="stat-label">Characteristic definitions</span></article>
        <article className="stat-card"><span className="stat-value">{catalog.serviceSpecifications.length + catalog.resourceSpecifications.length}</span><span className="stat-label">Service + resource specs</span></article>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Catalog summary</p>
            <h2>Reusable baseline</h2>
          </div>
        </div>
        <div className="detail-grid">
          <article className="card">
            <h3>Catalog identity</h3>
            <dl className="data-list">
              <div className="data-row"><dt>Code</dt><dd>{catalog.catalog.code}</dd></div>
              <div className="data-row"><dt>Version</dt><dd>{catalog.catalog.version}</dd></div>
              <div className="data-row"><dt>Valid for</dt><dd>{catalog.catalog.validFor}</dd></div>
              <div className="data-row"><dt>TMF alignment</dt><dd>{catalog.tmfVersion}</dd></div>
            </dl>
          </article>
          <article className="card">
            <h3>Business domains</h3>
            <div className="tag-row large-tags">
              {(catalog.catalog.businessDomains || []).map((item) => <span key={item} className="tag">{item}</span>)}
            </div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">Product structure</p><h2>Product specifications and BOM hierarchy</h2></div></div>
        <div className="detail-grid">
          <article className="card">
            <h3>Product specifications</h3>
            <div className="table-scroll">
              <table className="catalog-table">
                <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Lifecycle</th><th>Business model</th><th>Category</th></tr></thead>
                <tbody>
                  {catalog.productSpecifications.map((spec) => (
                    <tr key={spec.code}><td><code>{spec.code}</code></td><td>{spec.name}</td><td>{spec.type || 'ProductSpecification'}</td><td>{spec.lifecycle || 'Draft'}</td><td>{spec.businessModel || 'TBD'}</td><td>{spec.category || 'Product'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="card">
            <h3>Hierarchy</h3>
            <div className="tree-list">
              {catalog.hierarchy.map((edge) => (
                <div className="tree-row" key={`${edge.parent}-${edge.child}`}>
                  <div className="tree-parent"><code>{edge.parent}</code></div>
                  <div className="tree-arrow">→</div>
                  <div className="tree-child"><code>{edge.child}</code></div>
                  <div className="tree-meta">min {edge.min} / max {edge.max ?? '∞'} / default {edge.defaultQty}</div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">Commercial layer</p><h2>Product offerings</h2></div></div>
        <div className="table-scroll">
          <table className="catalog-table">
            <thead><tr><th>Code</th><th>Name</th><th>Specification</th><th>Status</th><th>Valid for</th><th>Channels</th><th>Price</th></tr></thead>
            <tbody>
              {catalog.productOfferings.map((offering) => (
                <tr key={offering.code}>
                  <td><code>{offering.code}</code></td>
                  <td>{offering.name}</td>
                  <td><code>{offering.specificationCode}</code></td>
                  <td>{offering.status}</td>
                  <td>{offering.validFor}</td>
                  <td>{(offering.channels || []).join(', ')}</td>
                  <td>{offering.priceSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">Characteristics</p><h2>Universal characteristic definition template</h2></div></div>
        <div className="table-scroll">
          <table className="catalog-table dense-table">
            <thead>
              <tr>
                <th>Applies to</th><th>Name</th><th>Value type</th><th>Presence</th><th>Meaning</th><th>Cardinality</th><th>Configurable</th><th>Stage</th><th>Editing</th><th>Default</th><th>Allowed values</th><th>For inventory</th><th>For fulfillment</th><th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {catalog.characteristicDefinitions.map((item) => (
                <tr key={`${item.appliesTo}-${item.name}`}>
                  <td><code>{item.appliesTo}</code></td>
                  <td>{item.displayName}</td>
                  <td>{item.valueType}</td>
                  <td>{item.presence}</td>
                  <td>{item.presenceMeaning}</td>
                  <td>{item.minCardinality}..{item.maxCardinality ?? '∞'}</td>
                  <td>{item.configurable ? 'Y' : 'N'}</td>
                  <td>{item.configurableStage}</td>
                  <td>{item.editingBehaviour}</td>
                  <td>{item.defaultValue === null ? '—' : String(item.defaultValue)}</td>
                  <td>{(item.allowedValues || []).length ? item.allowedValues.join(', ') : '—'}</td>
                  <td>{item.inventoryImpact}</td>
                  <td>{item.fulfillmentImpact}</td>
                  <td>{item.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">Technical decomposition</p><h2>Service and resource structures</h2></div></div>
        <div className="detail-grid">
          <article className="card">
            <h3>Service specifications</h3>
            <ul className="bullet-list">
              {catalog.serviceSpecifications.map((item) => <li key={item.code}><strong>{item.name}</strong> — <code>{item.code}</code> — {item.summary || 'Service summary pending.'}</li>)}
            </ul>
          </article>
          <article className="card">
            <h3>Resource specifications</h3>
            <ul className="bullet-list">
              {catalog.resourceSpecifications.map((item) => <li key={item.code}><strong>{item.name}</strong> — <code>{item.code}</code> — {item.summary || 'Resource summary pending.'}</li>)}
            </ul>
          </article>
        </div>
        <div className="table-scroll top-gap">
          <table className="catalog-table">
            <thead><tr><th>Product spec</th><th>Service spec</th><th>Resource specs</th></tr></thead>
            <tbody>
              {catalog.serviceMapping.map((row) => (
                <tr key={`${row.productSpec}-${row.serviceSpec}`}>
                  <td><code>{row.productSpec}</code></td>
                  <td><code>{row.serviceSpec}</code></td>
                  <td>{(row.resourceSpecs || []).length ? row.resourceSpecs.map((item) => <code key={item}>{item} </code>) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">TMF620 examples</p><h2>Headless API payload previews</h2></div></div>
        <div className="detail-grid">
          <article className="card"><h3>ProductSpecification</h3><pre className="json-block">{JSON.stringify(catalog.tmf620Examples.productSpecification, null, 2)}</pre></article>
          <article className="card"><h3>ProductOffering</h3><pre className="json-block">{JSON.stringify(catalog.tmf620Examples.productOffering, null, 2)}</pre></article>
        </div>
      </section>
    </main>
  );
}
