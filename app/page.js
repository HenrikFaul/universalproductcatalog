const modules = [
  {
    title: "EPC Metamodel",
    description:
      "Product Specification, Product Offering, Resource Specification and Service Specification separation."
  },
  {
    title: "Hybrid EAV + JSONB",
    description:
      "Flexible dynamic attributes without hardcoded industry-specific database columns."
  },
  {
    title: "Pricing Engine",
    description:
      "Charge model, waterfall price overrides and secure formula evaluation without eval()."
  },
  {
    title: "Rules Engine",
    description:
      "Eligibility, compatibility, requires, excludes and constrains validation."
  },
  {
    title: "Universal Industry Matrix",
    description:
      "Validation-ready architecture for telecom, automotive, banking, logistics, manufacturing and other industries."
  }
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Universal Product Catalog</p>

        <h1>
          EPC foundation for configurable product, pricing and rule-based
          catalog management.
        </h1>

        <p className="hero-text">
          This deployment shell validates that the repository is now a proper
          Next.js application for Vercel while preserving the existing backend,
          pricing, formula and rules-engine test logic.
        </p>

        <div className="hero-actions">
          <a href="#modules" className="primary-button">
            View modules
          </a>
          <a href="#status" className="secondary-button">
            Deployment status
          </a>
        </div>
      </section>

      <section id="modules" className="card-grid" aria-label="EPC modules">
        {modules.map((module) => (
          <article className="card" key={module.title}>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
          </article>
        ))}
      </section>

      <section id="status" className="status-panel">
        <h2>Deployment status</h2>
        <p>
          Next.js app shell is active. Existing Node.js tests should remain
          executable through <code>npm test</code>.
        </p>
      </section>
    </main>
  );
}
