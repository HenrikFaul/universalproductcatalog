Step 5 package: Supabase persistence wiring + hierarchy builder.

What this patch does:
- wires the catalog experience to the configured Supabase backend URL via env variables
- adds a server-side REST helper using SUPABASE_SERVICE_ROLE_KEY
- adds API routes for persisted catalog creation, characteristic saving and hierarchy saving
- updates the catalog index to show persisted catalogs from Supabase
- updates the catalog detail page to support demo or persisted catalogs
- upgrades the catalog builder so it can save a catalog to Supabase
- upgrades the characteristic manager to persist changes to Supabase
- adds the hierarchy builder route and client, with persistence for bundle edges
- adds a migration file creating public.upc_catalogs

Important environment variables:
- NEXT_PUBLIC_SUPABASE_URL=https://slxfcawdkwfspjkgpxrd.supabase.co
- SUPABASE_SERVICE_ROLE_KEY=<required for write support>

Honest constraint:
- the latest uploaded repo state did not actually contain live Supabase runtime wiring yet
- this patch is the first real runtime backend wiring layer for that repo state
