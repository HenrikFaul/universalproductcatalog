import React from 'react';

function Field({ def, value, onChange, disabled }) {
  const id = `dyn_${def.attribute_key}`;
  if (def.ui_component === 'select') {
    return (
      <label htmlFor={id} className="field">
        <span>{def.display_name}</span>
        <select id={id} value={value ?? ''} onChange={(e) => onChange(def.attribute_key, e.target.value)} disabled={disabled}>
          <option value="">Choose…</option>
          {(def.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </label>
    );
  }

  if (def.ui_component === 'radio') {
    return (
      <fieldset className="field">
        <legend>{def.display_name}</legend>
        {(def.options || []).map((opt) => (
          <label key={opt.value}>
            <input
              type="radio"
              name={id}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(def.attribute_key, e.target.value)}
              disabled={disabled}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <label htmlFor={id} className="field">
      <span>{def.display_name}</span>
      <input
        id={id}
        type={def.ui_component === 'number' ? 'number' : 'text'}
        value={value ?? ''}
        onChange={(e) => onChange(def.attribute_key, e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

export function DynamicFormRenderer({ schemaState, values, onChange, disabledKeys = [], error }) {
  if (schemaState.status === 'loading') return <div role="status">Loading attributes…</div>;
  if (schemaState.status === 'error') return <div role="alert">Error loading schema: {error || schemaState.error}</div>;
  if (!schemaState.schema || schemaState.schema.length === 0) return <div>No configurable attributes found.</div>;

  const groups = schemaState.schema.reduce((acc, def) => {
    const key = def.ui_group || 'General';
    (acc[key] ||= []).push(def);
    return acc;
  }, {});

  return (
    <form className="dyn-form" aria-label="Dynamic EPC form">
      {Object.entries(groups).map(([group, defs]) => (
        <section key={group} className="group" aria-label={group}>
          <h3>{group}</h3>
          <div className="group-grid">
            {defs.map((def) => (
              <Field
                key={def.attribute_key}
                def={def}
                value={values[def.attribute_key]}
                onChange={onChange}
                disabled={disabledKeys.includes(def.attribute_key)}
              />
            ))}
          </div>
        </section>
      ))}
    </form>
  );
}
