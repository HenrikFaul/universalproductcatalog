.card {
  display: grid;
  gap: var(--spacing-5);
  padding: var(--spacing-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--motion-base) var(--ease-standard),
    box-shadow var(--motion-base) var(--ease-standard),
    border-color var(--motion-base) var(--ease-standard);
}

.card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-strong);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.headerContent {
  display: grid;
  gap: var(--spacing-2);
  min-width: 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  font: var(--font-weight-semibold) var(--text-caption) / var(--line-height-snug) var(--font-family-sans);
  color: var(--color-primary-strong);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.titleRow {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.title {
  margin: 0;
  font: var(--font-weight-bold) var(--text-h2) / var(--line-height-tight) var(--font-family-sans);
  color: var(--color-text-primary);
}

.subline {
  margin: 0;
  font: var(--font-weight-regular) var(--text-body) / var(--line-height-normal) var(--font-family-sans);
  color: var(--color-text-secondary);
  max-width: 72ch;
}

.statusGroup {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding-inline: var(--spacing-3);
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font: var(--font-weight-medium) var(--text-caption) / 1 var(--font-family-sans);
  white-space: nowrap;
}

.pillSuccess {
  color: var(--color-success);
  background: var(--color-success-soft);
  border-color: var(--color-success-border);
}

.pillInfo {
  color: var(--color-info);
  background: var(--color-info-soft);
  border-color: var(--color-info-border);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.primaryButton,
.secondaryButton {
  appearance: none;
  border: 0;
  border-radius: var(--radius-pill);
  min-height: 2.75rem;
  padding-inline: var(--spacing-4);
  font: var(--font-weight-semibold) var(--text-body-sm) / 1 var(--font-family-sans);
  cursor: pointer;
  transition:
    transform var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    background var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard);
}

.primaryButton {
  color: var(--color-text-inverse);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
  box-shadow: var(--shadow-xs);
}

.primaryButton:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.secondaryButton {
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
}

.secondaryButton:hover {
  background: var(--color-surface-muted);
  border-color: var(--color-border-strong);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-3);
}

.metric {
  display: grid;
  gap: var(--spacing-1);
  padding: var(--spacing-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border-subtle);
}

.metricLabel {
  font: var(--font-weight-medium) var(--text-caption) / var(--line-height-snug) var(--font-family-sans);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.metricValue {
  font: var(--font-weight-semibold) var(--text-body-lg) / var(--line-height-snug) var(--font-family-sans);
  color: var(--color-text-primary);
}

.bodyGrid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 1fr);
  gap: var(--spacing-5);
}

.stack {
  display: grid;
  gap: var(--spacing-4);
}

.section {
  display: grid;
  gap: var(--spacing-3);
}

.sectionTitle {
  margin: 0;
  font: var(--font-weight-semibold) var(--text-body-sm) / var(--line-height-snug) var(--font-family-sans);
  color: var(--color-text-primary);
}

.keyValueGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-3);
}

.keyValue {
  display: grid;
  gap: var(--spacing-1);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--color-divider);
}

.key {
  font: var(--font-weight-medium) var(--text-caption) / var(--line-height-snug) var(--font-family-sans);
  color: var(--color-text-muted);
}

.value {
  font: var(--font-weight-medium) var(--text-body) / var(--line-height-normal) var(--font-family-sans);
  color: var(--color-text-primary);
}

.chips {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding-inline: var(--spacing-3);
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font: var(--font-weight-medium) var(--text-caption) / 1 var(--font-family-sans);
  border: 1px solid var(--color-border-subtle);
}

.aside {
  display: grid;
  gap: var(--spacing-4);
  padding: var(--spacing-5);
  background: linear-gradient(180deg, var(--color-surface), var(--color-surface-accent));
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.asideTitle {
  margin: 0;
  font: var(--font-weight-semibold) var(--text-body) / var(--line-height-snug) var(--font-family-sans);
  color: var(--color-text-primary);
}

.timeline {
  display: grid;
  gap: var(--spacing-3);
}

.timelineItem {
  display: grid;
  gap: var(--spacing-1);
  padding-left: var(--spacing-3);
  border-left: 2px solid var(--color-divider);
}

.timelineLabel {
  font: var(--font-weight-medium) var(--text-caption) / var(--line-height-snug) var(--font-family-sans);
  color: var(--color-text-muted);
}

.timelineValue {
  font: var(--font-weight-medium) var(--text-body-sm) / var(--line-height-normal) var(--font-family-sans);
  color: var(--color-text-primary);
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-4);
  flex-wrap: wrap;
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--color-divider);
}

.footerText {
  font: var(--font-weight-regular) var(--text-body-sm) / var(--line-height-normal) var(--font-family-sans);
  color: var(--color-text-secondary);
}

.inlineLink {
  color: var(--color-primary-strong);
  text-decoration: none;
  font-weight: var(--font-weight-semibold);
}

.inlineLink:hover {
  text-decoration: underline;
}

@media (max-width: 75rem) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bodyGrid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 48rem) {
  .card {
    padding: var(--spacing-5);
  }

  .metrics,
  .keyValueGrid {
    grid-template-columns: 1fr;
  }

  .actions,
  .footer {
    align-items: stretch;
  }

  .primaryButton,
  .secondaryButton {
    width: 100%;
  }
}
