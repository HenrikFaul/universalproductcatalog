import styles from './PremiumCatalogProductCard.module.css';

export default function PremiumCatalogProductCard() {
  return (
    <article className={styles.card} aria-label="Premium enterprise catalog card preview">
      <header className={styles.header}>
        <div className={styles.headerIntro}>
          <span className={styles.eyebrow}>Product specification</span>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Wired Internet</h2>
            <div className={styles.statusRow}>
              <span className={`${styles.pill} ${styles.successPill}`}>Launched</span>
              <span className={`${styles.pill} ${styles.infoPill}`}>Telecom</span>
            </div>
          </div>
          <p className={styles.description}>
            Enterprise-ready fixed connectivity product template with reusable characteristics,
            TMF620-aligned specification metadata and service/resource decomposition support.
          </p>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton}>Open hierarchy</button>
          <button type="button" className={styles.primaryButton}>Edit product</button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Product metrics">
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Characteristics</span>
          <strong className={styles.metricValue}>14 active</strong>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Bundle relations</span>
          <strong className={styles.metricValue}>6 connected</strong>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Service specs</span>
          <strong className={styles.metricValue}>3 mapped</strong>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Lifecycle</span>
          <strong className={styles.metricValue}>Effective dated</strong>
        </div>
      </section>

      <div className={styles.body}>
        <section className={styles.mainCard}>
          <h3 className={styles.sectionTitle}>Basic info</h3>
          <dl className={styles.keyValueGrid}>
            <div className={styles.keyValueRow}>
              <dt className={styles.key}>Code</dt>
              <dd className={styles.value}>PS_WIRED_INTERNET</dd>
            </div>
            <div className={styles.keyValueRow}>
              <dt className={styles.key}>Version</dt>
              <dd className={styles.value}>v5</dd>
            </div>
            <div className={styles.keyValueRow}>
              <dt className={styles.key}>Business model</dt>
              <dd className={styles.value}>B2C fixed connectivity</dd>
            </div>
            <div className={styles.keyValueRow}>
              <dt className={styles.key}>Commercial status</dt>
              <dd className={styles.value}>Sellable</dd>
            </div>
          </dl>

          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>Characteristic groups</h4>
            <div className={styles.chipRow}>
              <span className={styles.chip}>Bandwidth</span>
              <span className={styles.chip}>Contract term</span>
              <span className={styles.chip}>Router included</span>
              <span className={styles.chip}>Installation type</span>
              <span className={styles.chip}>Business activity</span>
            </div>
          </div>
        </section>

        <aside className={styles.asideCard}>
          <h3 className={styles.sectionTitle}>Operational snapshot</h3>
          <div className={styles.timeline}>
            <div className={styles.timelineRow}>
              <span className={styles.key}>Last change</span>
              <span className={styles.value}>2026-04-26 · Henrik Faul</span>
            </div>
            <div className={styles.timelineRow}>
              <span className={styles.key}>Fulfillment path</span>
              <span className={styles.value}>Broadband access → ONT → Router</span>
            </div>
            <div className={styles.timelineRow}>
              <span className={styles.key}>Pricing mode</span>
              <span className={styles.value}>AST formula + overrides</span>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
