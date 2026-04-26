const DEFAULT_SUPABASE_URL = 'https://slxfcawdkwfspjkgpxrd.supabase.co';
const TABLE_NAME = 'upc_catalogs';

export function getConfiguredSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  );
}

export function getSupabaseTableName() {
  return TABLE_NAME;
}

export function hasSupabaseWriteAccess() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function buildHeaders(extra = {}) {
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Set it in Vercel/Next environment variables to enable catalog persistence.',
    );
  }

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra,
  };
}

export async function supabaseRest(path, init = {}) {
  const url = `${getConfiguredSupabaseUrl()}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...init,
    headers: buildHeaders(init.headers),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const details = payload ? JSON.stringify(payload) : response.statusText;
    throw new Error(`Supabase REST request failed (${response.status}) at ${path}: ${details}`);
  }

  return payload;
}
