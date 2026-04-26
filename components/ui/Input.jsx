'use client';

import { forwardRef, useId } from 'react';

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

const Input = forwardRef(function Input(
  {
    className,
    description,
    error,
    id,
    inputClassName,
    label,
    leading,
    multiline = false,
    trailing,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = [
    description ? `${fieldId}-description` : null,
    error ? `${fieldId}-error` : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const Element = multiline ? 'textarea' : 'input';

  return (
    <label className={cx('ds-field', className)} htmlFor={fieldId}>
      {label ? (
        <span className="ds-field__topline">
          <span className="ds-field__label">{label}</span>
        </span>
      ) : null}

      <span
        className={cx(
          'ds-input-wrap',
          multiline && 'ds-textarea-wrap',
        )}
        data-invalid={Boolean(error)}
      >
        {leading ? <span className="ds-field__slot">{leading}</span> : null}
        <Element
          ref={ref}
          id={fieldId}
          className={cx(multiline ? 'ds-textarea' : 'ds-input', inputClassName)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {trailing ? <span className="ds-field__slot">{trailing}</span> : null}
      </span>

      {description ? (
        <span className="ds-field__hint" id={`${fieldId}-description`}>
          {description}
        </span>
      ) : null}

      {error ? (
        <span className="ds-field__error" id={`${fieldId}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
});

export default Input;
