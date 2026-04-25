import Link from 'next/link';
import { getIndustrySummaries, getOverviewStats, modules } from './lib/catalogData';

export default async function HomePage() {
  const [stats, industries] = await Promise.all([getOverviewStats(), getIndustrySummaries()]);
  const featuredIndustries = industries.slice(0, 6);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Universal Product Catalog</p>

        <h1>
          EPC foundation for configurable product, pricing and rule-based
          catalog management.
        </h1>

        <p className="hero-text">
          The deployable shell is now wired to the actual module inventory and
          industry payload examples already present in the repository. You can
          open modules and supported industry structures from here.
        </p>

        <div className="hero-actions">
          <Link href="/modules" className="primary-button">
            Open modules
          </Link>
          <Link href="/industries" className="secondary-button">
            Open industries
          </Link>
        </div>
      </section>

      <section className="stats-grid" aria-label="Catalog coverage stats">
        <article className="stat-card">
          <span className="stat-value">{stats.moduleCount}</span>
          <span className="stat-label">Implemented modules</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{stats.industryCount}</span>
          <span className="stat-label">Industry payload groups</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{stats.payloadCount}</span>
          <span className="stat-label">Catalog payload examples</span>
        </article>
        <article className="stat-card">
          <span className="stat-value">{stats.bundleCount}</span>
          <span className="stat-label">Bundle definitions</span>
        </article>
      </section>

      <section id="modules" className="section-block" aria-labelledby="modules-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Modules</p>
            <h2 id="modules-heading">Implemented domain capabilities</h2>
          </div>
          <Link href="/modules" className="secondary-button compact-button">
            See all modules
          </Link>
        </div>

        <div className="card-grid">
          {modules.slice(0, 6).map((module) => (
            <Link href={`/modules/${module.slug}`} className="card interactive-card" key={module.slug}>
              <div className="card-topline">
                <h3>{module.title}</h3>
                <span className="status-pill">{module.status}</span>
              </div>
              <p>{module.summary}</p>
              <span className="text-link">Open module →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="industries-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Industries</p>
            <h2 id="industries-heading">Preloaded industry structures</h2>
          </div>
          <Link href="/industries" className="secondary-button compact-button">
            See all industries
          </Link>
        </div>

        <div className="card-grid">
          {featuredIndustries.map((industry) => (
            <Link href={`/industries/${industry.slug}`} className="card interactive-card" key={industry.slug}>
              <div className="card-topline">
                <h3>{industry.industry}</h3>
                <span className="status-pill">{industry.offeringCount} payloads</span>
              </div>
              <p>
                {industry.offerings.slice(0, 2).join(' • ')}
                {industry.offerings.length > 2 ? ' …' : ''}
              </p>
              <div className="tag-row">
                {industry.topAttributes.slice(0, 4).map((attribute) => (
                  <span className="tag" key={attribute}>
                    {attribute}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="status" className="status-panel">
        <h2>Deployment status</h2>
        <p>
          Next.js app shell is active and now linked to repository-backed module
          and industry explorer pages. Existing Node.js tests should remain
          executable through <code>npm test</code>.
        </p>
      </section>
    </main>
  );
}
