import Link from 'next/link';
import { modules } from '../lib/catalogData';

export const metadata = {
  title: 'Modules | Universal Product Catalog',
};

export default function ModulesPage() {
  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <p className="eyebrow">Modules</p>
        <h1 className="section-title">Implemented catalog capabilities</h1>
        <p className="hero-text">
          These modules are already represented in the codebase. Open any module
          to see what it does, which files implement it and which industries it
          supports.
        </p>
        <div className="hero-actions">
          <Link href="/catalogs/telecom-demo" className="secondary-button">Open telecom demo catalog</Link>
          <Link href="/catalogs/new" className="secondary-button">Create new catalog</Link>
        </div>
      </section>

      <section className="section-block">
        <div className="list-grid">
          {modules.map((module) => (
            <Link href={`/modules/${module.slug}`} className="card interactive-card list-card" key={module.slug}>
              <div className="card-topline">
                <h2>{module.title}</h2>
                <span className="status-pill">{module.status}</span>
              </div>
              <p>{module.description}</p>
              <div className="tag-row">
                {module.relatedIndustries.slice(0, 5).map((industry) => (
                  <span className="tag" key={industry}>{industry}</span>
                ))}
              </div>
              <span className="text-link">Open module →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
