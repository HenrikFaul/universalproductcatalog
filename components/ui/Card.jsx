function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export default function Card({
  actions,
  children,
  className,
  description,
  footer,
  padding = 'lg',
  title,
  tone,
}) {
  return (
    <section
      className={cx('ds-card', `ds-card--padding-${padding}`, className)}
      data-tone={tone || undefined}
    >
      {(title || description || actions) ? (
        <header className="ds-card__header">
          <div>
            {title ? <h2 className="ds-card__title">{title}</h2> : null}
            {description ? <p className="ds-card__description">{description}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>
      ) : null}

      <div className="ds-card__content">{children}</div>

      {footer ? <footer className="ds-card__footer">{footer}</footer> : null}
    </section>
  );
}
