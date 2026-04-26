import styles from './ProductDefinitionPreviewCard.module.css';

export default function ProductDefinitionPreviewCard() {
  return (
    <article className={styles.card} aria-label="Premium product definition preview card">
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.eyebrow}>Product specification</span>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Wired Internet</h2>
            <div className={styles.statusGroup}>
              <span className={`${styles.pill} ${styles.pillSuccess}`}>Launched</span>
              <span className={`${styles.pill} ${styles.pillInfo}`}>Telecom</span>
            </div>
          </div>
          <p className={styles.subline}>
            Premium B2C fixed connectivity product definition with modular service decomposition,
            reusable characteristics and fulfillment-oriented resource mapping.
          </p>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton}>View hierarchy</button>
          <button type="button" className={styles.primaryButton}>Edit product</button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Product key metrics">
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Characteristics</span>
          <span className={styles.metricValue}>14 active</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Bundle relations</span>
          <span className={styles.metricValue}>6 connected</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Service specs</span>
          <span className={styles.metricValue}>3 attached</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Lifecycle</span>
          <span className={styles.metricValue}>Effective dated</span>
        </div>
      </section>

      <div className={styles.bodyGrid}>
        <div className={styles.stack}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Basic information</h3>
            <div className={styles.keyValueGrid}>
              <div className={styles.keyValue}>
                <span className={styles.key}>Code</span>
                <span className={styles.value}>PS_WIRED_INTERNET</span>
              </div>
              <div className={styles.keyValue}>
                <span className={styles.key}>Version</span>
                <span className={styles.value}>v5</span>
              </div>
              <div className={styles.keyValue}>
                <span className={styles.key}>Product type</span>
                <span className={styles.value}>Composite service-backed offer</span>
              </div>
              <div className={styles.keyValue}>
                <span className={styles.key}>Commercial status</span>
                <span className={styles.value}>Sellable</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Characteristic groups</h3>
            <div className={styles.chips}>
              <span className={styles.chip}>Bandwidth</span>
              <span className={styles.chip}>Contract term</span>
              <span className={styles.chip}>Router included</span>
              <span className={styles.chip}>Installation type</span>
              <span className={styles.chip}>Business activity</span>
            </div>
          </section>
        </div>

        <aside className={styles.aside}>
          <h3 className={styles.asideTitle}>Operational snapshot</h3>
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Last change</span>
              <span className={styles.timelineValue}>2026-04-26 11:14 · Henrik Faul</span>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Fulfillment path</span>
              <span className={styles.timelineValue}>Broadband access → ONT → Router</span>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Pricing mode</span>
              <span className={styles.timelineValue}>AST formula + waterfall overrides</span>
            </div>
          </div>
        </aside>
      </div>

      <footer className={styles.footer}>
        <span className={styles.footerText}>
          Designed for breathable, enterprise-grade catalog editing with clear hierarchy and low cognitive load.
        </span>
        <a className={styles.inlineLink} href="#">Open TMF620 preview</a>
      </footer>
    </article>
  );
}
