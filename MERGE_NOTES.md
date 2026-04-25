# Merge notes

This package merges:
- `universalproductcatalog-main.zip`
- `universalproductcatalog-codex-implement-epc-lifecycle-with-effective-dating.zip`
- `universalproductcatalog-codex-implement-epc-lifecycle-with-effective-dating-laz7ik.zip`

## Merge strategy
- Kept the `main` branch as the base.
- Merged in functional additions from the Codex branches.
- Preserved `main`-only Next.js app shell files:
  - `app/globals.css`
  - `app/layout.js`
  - `app/page.js`
  - `next.config.mjs`
  - `PACKAGE_JSON_REQUIRED_PATCH.md`
  - `UPLOAD_AND_VALIDATE.md`
  - `package-lock.json`
- Kept the `main` package scripts/dependencies so the app remains buildable as a Next.js project.
- Updated `package.json` version to `2.4.0` to reflect the newer functional delivery.

## Functional additions merged in
- TMF620 API scaffolding
- Extended DDL for effective dating, resource/service specs, BOM, validation JSON, GIST/GIN indexing
- Extended pricing engine (flat/per-unit/tiered/attribute-based)
- Decision-matrix price book selection
- Rules engine additions including `ELIGIBILITY`, working memory, latency reporting
- Schema UI engine additions
- Industry payloads + compatibility validation
- Updated changelog / validation checklist / lessons learned from the newer Codex branch

## Verification
- `npm test` executed successfully after merge: 9/9 tests passed.
