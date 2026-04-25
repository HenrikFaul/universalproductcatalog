# universalproductcatalog

Reference EPC implementation with:
- Relational core model + JSONB dynamic attributes (EAV hybrid)
- Dynamic grouped UI form renderer contract
- Secure AST pricing engine and price-book waterfall overrides
- Event-driven rules engine for Requires/Excludes/Constrains
- Effective dating and versioning helpers (major/minor)
- TMF620-style headless API scaffolding

## Vercel deployment notes

Current repo is backend/domain-first. If you selected **Next.js** preset, use Next-style public env keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, never public)

`VITE_*` prefixes are only for Vite builds; avoid them in Next.js projects.

## Run tests

```bash
npm test
```
