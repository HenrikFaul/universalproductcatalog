export function buildRenderableFields(schema) {
  return (schema || [])
    .filter((node) => node.configurable === true)
    .map((node) => ({
      attribute_key: node.attribute_key,
      display_name: node.display_name,
      ui_component: node.ui_component || 'text',
      ui_group: node.ui_group || 'General',
      options: node.options || [],
      validation: node.validation || {}
    }));
}

export function validateDynamicValues(schema, values) {
  const errors = {};
  for (const node of schema || []) {
    if (node.configurable !== true) continue;
    const value = values[node.attribute_key];
    const rules = node.validation || {};
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[node.attribute_key] = 'Required';
      continue;
    }
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) errors[node.attribute_key] = `Min ${rules.min}`;
      if (rules.max !== undefined && value > rules.max) errors[node.attribute_key] = `Max ${rules.max}`;
    }
  }
  return errors;
}
