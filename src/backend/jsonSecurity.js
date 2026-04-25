const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function sanitizeDynamicAttributes(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('dynamic_attributes must be a JSON object');
  }

  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`forbidden key: ${key}`);
    }
  }
  return payload;
}

export function canMutateJson(user, action) {
  if (!user?.roles) return false;
  const isCatalogAdmin = user.roles.includes('catalog_admin');
  const isWriter = user.roles.includes('catalog_writer');
  return isCatalogAdmin || (isWriter && action === 'update');
}
