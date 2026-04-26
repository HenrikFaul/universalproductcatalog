'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export default function Modal({
  actions,
  children,
  className,
  description,
  onClose,
  open,
  title,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="ds-modal-root" role="presentation">
      <button
        type="button"
        className="ds-modal-backdrop"
        aria-label="Close modal"
        onClick={() => onClose?.()}
      />
      <div className="ds-modal-shell">
        <section
          className={cx('ds-modal-panel', className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ds-modal-title"
          aria-describedby={description ? 'ds-modal-description' : undefined}
        >
          {(title || description) ? (
            <header className="ds-modal__header">
              {title ? <h2 className="ds-modal__title" id="ds-modal-title">{title}</h2> : null}
              {description ? <p className="ds-modal__description" id="ds-modal-description">{description}</p> : null}
            </header>
          ) : null}

          <div className="ds-modal__body">{children}</div>

          {actions ? <footer className="ds-modal__footer">{actions}</footer> : null}
        </section>
      </div>
    </div>,
    document.body,
  );
}
