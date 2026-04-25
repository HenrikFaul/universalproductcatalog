import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getModuleBySlug, modules } from '../../lib/catalogData';

export function generateStaticParams() {
  return modules.map((module) => ({ slug: module.slug }));
}

export function generateMetadata({ params }) {
  const module = getModuleBySlug(params.slug);
  if (!module) {
    return { title: 'Module not found | Universal Product Catalog' };
  }
  return { title: `${module.title} | Universal Product Catalog` };
}

export default function ModuleDetailsPage({ params }) {
  const module = getModuleBySlug(params.slug);

  if (!module) {
    notFound();
  }

  return (
    <main className="page-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span> / </span>
        <Link href="/modules">Modules</Link>
        <span> / </span>
        <span>{module.title}</span>
      </nav>

      <section className="hero compact-hero">
        <p className="eyebrow">Module detail</p>
        <h1 className="section-title">{module.title}</h1>
        <p className="hero-text">{module.description}</p>
        <div className="hero-actions">
          <Link href="/modules" className="secondary-button">Back to modules</Link>
          <Link href="/catalogs/telecom-demo" className="secondary-button">Open telecom demo catalog</Link>
          <Link href="/catalogs/new" className="secondary-button">Create new catalog</Link>
        </div>
      </section>

      <section className="detail-grid">
        <article className="card">
          <h2>What is already implemented</h2>
          <ul className="bullet-list">
            {module.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Source files</h2>
          <ul className="bullet-list code-list">
            {module.sourceFiles.map((item) => (
              <li key={item}><code>{item}</code></li>
            ))}
          </ul>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Industry support</p>
            <h2>Industries this module can serve</h2>
          </div>
        </div>
        <div className="tag-row large-tags">
          {module.relatedIndustries.map((industry) => (
            <Link href={`/industries/${industry.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="tag actionable-tag" key={industry}>
              {industry}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
