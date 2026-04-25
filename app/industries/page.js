import Link from 'next/link';
import { getIndustrySummaries } from '../lib/catalogData';

export const metadata = {
  title: 'Industries | Universal Product Catalog',
};

export default async function IndustriesPage() {
  const industries = await getIndustrySummaries();

  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <p className="eyebrow">Industries</p>
        <h1 className="section-title">Industry-ready payload structures</h1>
        <p className="hero-text">
          These industry payloads are already present in the repository and can
          be used as starting points for configurable catalog structures.
        </p>
      </section>

      <section className="section-block">
        <div className="list-grid">
          {industries.map((industry) => (
            <Link href={`/industries/${industry.slug}`} className="card interactive-card list-card" key={industry.slug}>
              <div className="card-topline">
                <h2>{industry.industry}</h2>
                <span className="status-pill">{industry.offeringCount} payloads</span>
              </div>
              <p>
                {industry.offerings.slice(0, 3).join(' • ')}
                {industry.offerings.length > 3 ? ' …' : ''}
              </p>
              <div className="tag-row">
                {industry.topAttributes.slice(0, 5).map((attribute) => (
                  <span className="tag" key={attribute}>{attribute}</span>
                ))}
              </div>
              <span className="text-link">Open industry →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
