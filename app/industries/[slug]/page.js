import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIndustryDetailsBySlug, getIndustrySlugs } from '../../lib/catalogData';

export function generateStaticParams() {
  return getIndustrySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const industry = await getIndustryDetailsBySlug(resolvedParams.slug);
  if (!industry) {
    return { title: 'Industry not found | Universal Product Catalog' };
  }
  return { title: `${industry.industry} | Universal Product Catalog` };
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default async function IndustryDetailsPage({ params }) {
  const resolvedParams = await params;
  const industry = await getIndustryDetailsBySlug(resolvedParams.slug);

  if (!industry) {
    notFound();
  }

  return (
    <main className="page-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span> / </span>
        <Link href="/industries">Industries</Link>
        <span> / </span>
        <span>{industry.industry}</span>
      </nav>

      <section className="hero compact-hero">
        <p className="eyebrow">Industry detail</p>
        <h1 className="section-title">{industry.industry}</h1>
        <p className="hero-text">
          Repository-backed sample payloads and module mapping for this industry.
        </p>
      </section>

      <section className="detail-grid">
        <article className="card">
          <h2>Example offerings</h2>
          <ul className="bullet-list">
            {industry.entries.map((entry) => (
              <li key={entry.offering}>{entry.offering}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Related modules</h2>
          <div className="tag-row large-tags">
            {industry.relatedModules.map((module) => (
              <Link href={`/modules/${module.slug}`} className="tag actionable-tag" key={module.slug}>
                {module.title}
              </Link>
            ))}
          </div>
        </article>
      </section>

      {industry.relatedBundles.length > 0 ? (
        <section className="section-block">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Bundles</p>
              <h2>Related EPC bundles</h2>
            </div>
          </div>
          <div className="list-grid">
            {industry.relatedBundles.map((bundle) => (
              <article className="card" key={bundle.code}>
                <div className="card-topline">
                  <h3>{bundle.code}</h3>
                  <span className="status-pill">Bundle</span>
                </div>
                <ul className="bullet-list">
                  {(bundle.components || []).map((component) => (
                    <li key={component}><code>{component}</code></li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Payload entries</p>
            <h2>Dynamic attribute examples</h2>
          </div>
        </div>
        <div className="list-grid">
          {industry.entries.map((entry) => (
            <article className="card" key={entry.offering}>
              <div className="card-topline">
                <h3>{entry.offering}</h3>
                <span className="status-pill">
                  {entry.dynamic_attributes?.configurable ? 'Configurable' : 'Static'}
                </span>
              </div>
              <dl className="data-list">
                {Object.entries(entry.dynamic_attributes || {})
                  .filter(([key]) => key !== 'configurable')
                  .map(([key, value]) => (
                    <div className="data-row" key={key}>
                      <dt>{key}</dt>
                      <dd>{formatValue(value)}</dd>
                    </div>
                  ))}
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
