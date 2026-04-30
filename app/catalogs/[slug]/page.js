import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveCatalogBySlug } from '../../lib/catalogPersistence';
import CloneCatalogButton from '../../../components/catalog/CloneCatalogButton';

export const dynamic = 'force-dynamic';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstItems(items, limit = 6) {
  return asArray(items).slice(0, limit);
}

function CellCode({ children }) {
  return children ? <code>{children}</code> : '—';
}

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

  const productSpecifications = asArray(catalog.productSpecifications);
  const productOfferings = asArray(catalog.productOfferings);
  const characteristicDefinitions = asArray(catalog.characteristicDefinitions);
  const productInventory = asArray(catalog.productInventory);
  const hierarchy = asArray(catalog.hierarchy);
  const serviceSpecifications = asArray(catalog.serviceSpecifications);
  const resourceSpecifications = asArray(catalog.resourceSpecifications);
  const serviceMapping = asArray(catalog.serviceMapping);

  return (
    <main className="page-shell catalog-shell catalog-detail-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span> / </span>
        <Link href="/catalogs">Catalogs</Link>
        <span> / </span>
        <span>{catalog.title}</span>
      </nav>

      <section className="hero compact-hero catalog-hero-refined">
        <p className="eyebrow">TMF620-style catalog</p>
        <h1 className="section-title">{catalog.title}</h1>
        <p className="hero-text">{catalog.description}</p>
        <div className="hero-actions">
          <CloneCatalogButton slug={catalog.slug} />
          <Link href={`/catalogs/${catalog.slug}/entities`} className="primary-button">Manage EPC entities</Link>
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
        <Link href={`/catalogs/${catalog.slug}/entities`} className="catalog-local-tab">Entities</Link>
        <Link href={`/catalogs/${catalog.slug}/hierarchy`} className="catalog-local-tab">Hierarchy Studio</Link>
        <Link href={`/catalogs/${catalog.slug}/characteristics`} className="catalog-local-tab">Characteristics</Link>
      </nav>

      <section className="stats-grid catalog-stats">
        <article className="stat-card"><span className="stat-value">{productSpecifications.length}</span><span className="stat-label">Product specifications</span></article>
        <article className="stat-card"><span className="stat-value">{productOfferings.length}</span><span className="stat-label">Product offerings</span></article>
        <article className="stat-card"><span className="stat-value">{characteristicDefinitions.length}</span><span className="stat-label">Characteristic definitions</span></article>
        <article className="stat-card"><span className="stat-value">{productInventory.length}</span><span className="stat-label">Products / inventory</span></article>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Catalog editing</p>
            <h2>Core EPC entities</h2>
          </div>
          <Link href={`/catalogs/${catalog.slug}/entities`} className="secondary-button compact-button">Add / edit / remove entities</Link>
        </div>
        <div className="entity-overview-grid">
          <article className="entity-overview-card">
            <p className="eyebrow">Specification</p>
            <h3>Product Specification</h3>
            <p>Defines the product/service template, reusable characteristics, lifecycle and bundle/BOM role.</p>
            <Link href={`/catalogs/${catalog.slug}/entities`} className="text-link">Manage specifications</Link>
          </article>
          <article className="entity-overview-card">
            <p className="eyebrow">Offering</p>
            <h3>Product Offering</h3>
            <p>Defines how a specification is sold: channel, status, validity, segment, price summary and pricing JSON.</p>
            <Link href={`/catalogs/${catalog.slug}/entities`} className="text-link">Manage offerings</Link>
          </article>
          <article className="entity-overview-card">
            <p className="eyebrow">Inventory</p>
            <h3>Product</h3>
            <p>Defines an instantiated product connected to an offering/specification with customer, place and characteristic values.</p>
            <Link href={`/catalogs/${catalog.slug}/entities`} className="text-link">Manage products</Link>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Catalog summary</p>
            <h2>Reusable baseline</h2>
          </div>
        </div>
        <div className="detail-grid relaxed-grid">
          <article className="card">
            <h3>Catalog identity</h3>
            <dl className="data-list">
              <div className="data-row"><dt>Code</dt><dd>{catalog.catalog?.code}</dd></div>
              <div className="data-row"><dt>Version</dt><dd>{catalog.catalog?.version}</dd></div>
              <div className="data-row"><dt>Valid for</dt><dd>{catalog.catalog?.validFor}</dd></div>
              <div className="data-row"><dt>TMF alignment</dt><dd>{catalog.tmfVersion}</dd></div>
            </dl>
          </article>
          <article className="card">
            <h3>Business domains</h3>
            <div className="tag-row large-tags">
              {asArray(catalog.catalog?.businessDomains).map((item) => <span key={item} className="tag">{item}</span>)}
            </div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div><p className="eyebrow">Product structure</p><h2>Product specifications and BOM hierarchy</h2></div>
          <Link href={`/catalogs/${catalog.slug}/entities`} className="secondary-button compact-button">Edit product specs</Link>
        </div>
        <div className="detail-grid relaxed-grid">
          <article className="card overflow-safe-card">
            <h3>Product specifications</h3>
            <div className="compact-record-list">
              {firstItems(productSpecifications, 8).map((spec) => (
                <div className="compact-record" key={spec.code || spec.id || spec.name}>
                  <div>
                    <strong>{spec.name}</strong>
                    <span>{spec.lifecycle || spec.lifecycleStatus || 'Draft'} · {spec.category || 'ProductSpecification'}</span>
                  </div>
                  <CellCode>{spec.code || spec.id}</CellCode>
                </div>
              ))}
            </div>
          </article>
          <article className="card overflow-safe-card">
            <h3>Hierarchy</h3>
            <div className="tree-list compact-tree-list">
              {firstItems(hierarchy, 8).map((edge) => (
                <div className="tree-row" key={`${edge.parent}-${edge.child}`}>
                  <div className="tree-parent"><CellCode>{edge.parent}</CellCode></div>
                  <div className="tree-arrow">→</div>
                  <div className="tree-child"><CellCode>{edge.child}</CellCode></div>
                  <div className="tree-meta">min {edge.min} / max {edge.max ?? '∞'} / default {edge.defaultQty}</div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div><p className="eyebrow">Commercial layer</p><h2>Product offerings</h2></div>
          <Link href={`/catalogs/${catalog.slug}/entities`} className="secondary-button compact-button">Edit offerings</Link>
        </div>
        <div className="responsive-card-table">
          {productOfferings.map((offering) => (
            <article className="responsive-record-card" key={offering.code || offering.id || offering.name}>
              <header><strong>{offering.name}</strong><CellCode>{offering.code || offering.id}</CellCode></header>
              <dl>
                <div><dt>Specification</dt><dd><CellCode>{offering.specificationCode}</CellCode></dd></div>
                <div><dt>Status</dt><dd>{offering.status || offering.lifecycleStatus || 'Draft'}</dd></div>
                <div><dt>Valid for</dt><dd>{offering.validFor || 'open-ended'}</dd></div>
                <div><dt>Channels</dt><dd>{asArray(offering.channels).join(', ') || '—'}</dd></div>
                <div><dt>Price</dt><dd>{offering.priceSummary || 'Define pricing'}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div><p className="eyebrow">Product inventory</p><h2>Product instances</h2></div>
          <Link href={`/catalogs/${catalog.slug}/entities`} className="secondary-button compact-button">Edit products</Link>
        </div>
        <div className="responsive-card-table">
          {productInventory.map((product) => (
            <article className="responsive-record-card" key={product.code || product.id || product.name}>
              <header><strong>{product.name}</strong><CellCode>{product.code || product.id}</CellCode></header>
              <dl>
                <div><dt>Offering</dt><dd><CellCode>{product.productOfferingCode || product.productOffering?.id}</CellCode></dd></div>
                <div><dt>Specification</dt><dd><CellCode>{product.productSpecificationCode || product.productSpecification?.id}</CellCode></dd></div>
                <div><dt>Status</dt><dd>{product.status || product.lifecycleStatus || 'Created'}</dd></div>
                <div><dt>Serial / service ID</dt><dd>{product.productSerialNumber || product.serviceId || product.msisdn || '—'}</dd></div>
                <div><dt>Place</dt><dd>{product.place || '—'}</dd></div>
                <div><dt>Customer</dt><dd>{typeof product.relatedParty === 'string' ? product.relatedParty : product.relatedParty?.name || '—'}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div><p className="eyebrow">Characteristics</p><h2>Universal characteristic definition template</h2></div>
          <Link href={`/catalogs/${catalog.slug}/characteristics`} className="secondary-button compact-button">Edit characteristics</Link>
        </div>
        <div className="table-scroll constrained-table-scroll">
          <table className="catalog-table dense-table">
            <thead>
              <tr>
                <th>Applies to</th><th>Name</th><th>Type</th><th>Presence</th><th>Cardinality</th><th>Configurable</th><th>Stage</th><th>Default</th><th>Allowed values</th>
              </tr>
            </thead>
            <tbody>
              {characteristicDefinitions.map((item) => (
                <tr key={`${item.appliesTo}-${item.name}`}>
                  <td><CellCode>{item.appliesTo}</CellCode></td>
                  <td>{item.displayName || item.name}</td>
                  <td>{item.valueType}</td>
                  <td>{item.presence}</td>
                  <td>{item.minCardinality}..{item.maxCardinality ?? '∞'}</td>
                  <td>{item.configurable ? 'Y' : 'N'}</td>
                  <td>{item.configurableStage || item.stage}</td>
                  <td>{item.defaultValue === null || item.defaultValue === undefined ? '—' : String(item.defaultValue)}</td>
                  <td>{asArray(item.allowedValues).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">Technical decomposition</p><h2>Service and resource structures</h2></div></div>
        <div className="detail-grid relaxed-grid">
          <article className="card"><h3>Service specifications</h3><ul className="bullet-list compact-list">{serviceSpecifications.map((service) => <li key={service.code}><strong>{service.name}</strong> — <CellCode>{service.code}</CellCode></li>)}</ul></article>
          <article className="card"><h3>Resource specifications</h3><ul className="bullet-list compact-list">{resourceSpecifications.map((resource) => <li key={resource.code}><strong>{resource.name}</strong> — <CellCode>{resource.code}</CellCode></li>)}</ul></article>
        </div>
        {serviceMapping.length ? (
          <div className="table-scroll constrained-table-scroll decomposition-table">
            <table className="catalog-table">
              <thead><tr><th>Product spec</th><th>Service spec</th><th>Resource specs</th></tr></thead>
              <tbody>{serviceMapping.map((row) => <tr key={`${row.productSpec}-${row.serviceSpec}`}><td><CellCode>{row.productSpec}</CellCode></td><td><CellCode>{row.serviceSpec}</CellCode></td><td>{asArray(row.resourceSpecs).map((code) => <CellCode key={code}>{code}</CellCode>)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="section-block">
        <div className="section-heading-row"><div><p className="eyebrow">TMF620 examples</p><h2>Headless API payload previews</h2></div></div>
        <div className="detail-grid relaxed-grid">
          <article className="card"><h3>ProductSpecification</h3><pre className="code-preview">{JSON.stringify(catalog.tmf620Examples?.productSpecification || productSpecifications[0] || {}, null, 2)}</pre></article>
          <article className="card"><h3>ProductOffering</h3><pre className="code-preview">{JSON.stringify(catalog.tmf620Examples?.productOffering || productOfferings[0] || {}, null, 2)}</pre></article>
        </div>
      </section>
    </main>
  );
}
