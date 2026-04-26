'use client';

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export default function Tabs({ items, value, onChange, className, label = 'Tabs' }) {
  return (
    <div className={cx('ds-tabs', className)} role="tablist" aria-label={label}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            className={cx('ds-tabs__tab', selected && 'ds-tabs__tab--active')}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(item.value)}
          >
            <span>{item.label}</span>
            {item.badge ? <span className="ds-tabs__badge">{item.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
