'use client';

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export default function Button({
  children,
  className,
  disabled = false,
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'primary',
  ...props
}) {
  return (
    <button
      type={type}
      className={cx(
        'ds-button ds-focus-ring',
        `ds-button--${variant}`,
        size !== 'md' && `ds-button--${size}`,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="ds-button__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
