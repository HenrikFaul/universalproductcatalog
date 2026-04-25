Universal Product Catalog module wiring patch

Files included:
- app/page.js
- app/globals.css
- app/lib/catalogData.js
- app/modules/page.js
- app/modules/[slug]/page.js
- app/industries/page.js
- app/industries/[slug]/page.js

What this patch does:
- makes the landing page buttons open real routes instead of only in-page anchors
- turns module cards into clickable links
- adds /modules and /modules/[slug] pages
- adds /industries and /industries/[slug] pages
- wires the UI to existing repository data files:
  - data/industryPayloads.json
  - data/epcBundles.json

This patch is additive and keeps the existing Next.js shell structure.
