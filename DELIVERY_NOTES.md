# Step 3 — Characteristic CRUD UI

This patch adds the third requested layer:

- characteristic manager UI
- create / edit / delete flow
- protected delete confirmation modal
- export JSON capability
- no backend mutation / no regression to existing TMF620 demo catalog page

## Files
- `app/catalogs/[slug]/page.js` — adds entry point to manager
- `app/catalogs/[slug]/characteristics/page.js` — new route
- `app/catalogs/[slug]/characteristics/CharacteristicsManagerClient.jsx` — client CRUD
- `app/catalogs/[slug]/characteristics/CharacteristicsManagerClient.module.css` — scoped layout + spacing rules

## Important
This step assumes the Step 2 design-system foundation components already exist:
- `components/ui/Button.jsx`
- `components/ui/Input.jsx`
- `components/ui/Modal.jsx`
- `components/ui/Card.jsx`

## Persistence model
This CRUD layer intentionally stores changes in browser localStorage under a catalog-specific key.
It is designed to be replaced later with real backend persistence without redesigning the UI.
