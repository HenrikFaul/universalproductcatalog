import Link from 'next/link';
import { getIndustrySummaries, getOverviewStats, modules, getDemoCatalogs } from './lib/catalogData';

export default function HomePage() {
  const stats = getOverviewStats();
  const industries = getIndustrySummaries();
  const featuredIndustries = industries.slice(0, 8);
  const demoCatalog = getDemoCatalogs()[0];

  return (
    <main className="page-shell dashboard-shell">
      <section className="brand-hero dashboard-hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Intelligent Product Management</p>
          <h1>Universal Product Catalog for configurable enterprise portfolios.</h1>
          <p className="hero-text">Manage products, services, resources, characteristics and industry templates in one light, fast and governed TMF620-aligned workspace.</p>
          <div className="hero-actions">
            <Link href="/catalogs" className="primary-button">Open catalog workspace</Link>
            <Link href="/catalogs/new" className="secondary-button">Create new catalog</Link>
          </div>
        </div>
        <div className="hero-orbit-card" aria-label="UPC product graph summary">
          <div className="hero-orbit-brand"><span>UPC</span></div>
          <div className="orbit orbit-product">Product</div>
          <div className="orbit orbit-service">Service</div>
          <div className="orbit orbit-resource">Resource</div>
          <div className="orbit orbit-characteristic">Characteristic</div>
          <p>Configure. Govern. Orchestrate.</p>
        </div>
      </section>

      <section className="kpi-board" aria-label="Catalog coverage stats">
        <article className="kpi-card kpi-card--blue"><span className="kpi-icon">◈</span><span className="stat-value">{stats.moduleCount}</span><span className="stat-label">Implemented modules</span></article>
        <article className="kpi-card kpi-card--emerald"><span className="kpi-icon">◎</span><span className="stat-value">{stats.industryCount}</span><span className="stat-label">Industry template groups</span></article>
        <article className="kpi-card kpi-card--orange"><span className="kpi-icon">▤</span><span className="stat-value">{stats.payloadCount}</span><span className="stat-label">Payload examples</span></article>
        <article className="kpi-card kpi-card--violet"><span className="kpi-icon">▦</span><span className="stat-value">{stats.bundleCount}</span><span className="stat-label">Bundle definitions</span></article>
      </section>

      <section className="dashboard-grid" aria-label="UPC workspace overview">
        <Link href={`/catalogs/${demoCatalog.slug}`} className="dashboard-panel dashboard-panel--wide interactive-card">
          <div className="panel-heading"><div><p className="eyebrow">Demo catalog</p><h2>{demoCatalog.title}</h2></div><span className="status-pill status-pill--blue">TMF620 demo</span></div>
          <p>{demoCatalog.description}</p>
          <div className="dashboard-metric-row"><span><strong>{demoCatalog.productSpecifications.length}</strong> product specs</span><span><strong>{demoCatalog.productOfferings.length}</strong> offerings</span><span><strong>{demoCatalog.characteristicDefinitions.length}</strong> characteristics</span></div>
          <span className="text-link">Open telecom catalog →</span>
        </Link>
        <Link href="/catalogs/new" className="dashboard-panel interactive-card">
          <div className="panel-heading"><div><p className="eyebrow">Builder</p><h2>Start from an industry template</h2></div><span className="status-pill">20 templates</span></div>
          <p>Create a governed EPC/TMF620 catalog blueprint with products, characteristics, services and resources already structured.</p>
          <span className="text-link">Open builder →</span>
        </Link>
        <section className="dashboard-panel dashboard-panel--wide">
          <div className="panel-heading"><div><p className="eyebrow">Modules</p><h2>Domain capability map</h2></div><Link href="/modules" className="secondary-button compact-button">See all</Link></div>
          <div className="module-strip">{modules.slice(0, 6).map((module, index) => (<Link href={`/modules/${module.slug}`} className="module-tile" key={module.slug} data-tone={index % 4}><strong>{module.title}</strong><span>{module.status}</span></Link>))}</div>
        </section>
        <section className="dashboard-panel">
          <div className="panel-heading"><div><p className="eyebrow">Activity</p><h2>Workspace signals</h2></div></div>
          <div className="activity-list"><span><strong>Product</strong> hierarchy lanes ready</span><span><strong>Service</strong> mapping aligned</span><span><strong>Resource</strong> dependencies visible</span><span><strong>Characteristic</strong> governance active</span></div>
        </section>
      </section>

      <section className="section-block" aria-labelledby="industries-heading">
        <div className="section-heading-row"><div><p className="eyebrow">Starter templates</p><h2 id="industries-heading">Preloaded industry structures</h2></div><Link href="/catalogs" className="secondary-button compact-button">Open catalog list</Link></div>
        <div className="industry-row-grid">
          {featuredIndustries.map((industry, index) => (
            <Link href={`/industries/${industry.slug}`} className="industry-row interactive-card" key={industry.slug}>
              <span className="row-number">{index + 1}</span><div><strong>{industry.industry}</strong><p>{industry.offerings.slice(0, 2).join(' • ')}{industry.offerings.length > 2 ? ' …' : ''}</p></div>
              <div className="tag-row compact-tag-row">{industry.topAttributes.slice(0, 3).map((attribute) => (<span className="tag" key={attribute}>{attribute}</span>))}</div><span className="text-link">Open →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
