# EPC Validation Checklist Status

## v2.4.0_24050105
- [x] Payload examples added for first 6 industries (Telecom, Automotive, Banking, Logistics, Brewery, Optics).
- [x] Rules-based compatibility tests block biological and physical incompatibilities.
- [x] Lessons learnt and changelog updated append-only.

## v2.3.0_24050104
- [x] DAG-like event-scoped validation with working memory implemented.
- [x] Rules schema supports Requires, Excludes, Constrains (+ Eligibility).
- [x] In-memory validation provides API-friendly response and latency metric (< 100 ms in tests).
- [x] UI state/error support retained with contrast-safe error styles.

## v2.2.0_24050103
- [x] Charge model supports ONETIME/RECURRING/USAGE with FLAT_FEE, PER_UNIT, TIERED, ATTRIBUTE_BASED.
- [x] Safe AST parser integrated (`eval` not used).
- [x] Decision matrix lookup for context-based price book selection implemented.
- [x] Regression/performance tests pass.

## v2.1.0_24050102
- [x] Relational DDL + JSONB + UUID defaults + GIN/GIST indexing implemented.
- [x] Frontend schema engine generates validation from JSON `configurable` and `validation` nodes.
- [x] Mobile-first/overflow-safe dynamic form styles maintained.
- [x] Patch delivery artifact included.

## v2.0.0_24050101
- [x] TMF620 separation (Specification vs Offering) implemented.
- [x] Inheritance hierarchy helper implemented.
- [x] CPQ/Order Management headless endpoint scaffolding provided.
- [x] Changelog updated append-only.

## v1.0.0_24042501
- [x] Governance files: attempted read; files missing in repository, fallback documented.
- [x] `epc_product_specification` and `epc_product_offering` relational schema created.
- [x] JSONB dynamic attributes model created.
- [x] Dynamic UI renderer implemented with grouped fields and loading/empty/error states.
- [x] Squint/Overflow/Contrast checklist captured in tests + CSS constraints (375px safe layout).
- [x] JSON mutation guard implemented (role-based + payload sanitizer).
- [x] `CHANGELOG.md` updated append-only.
- [x] Patch package generated (`docs/only-patch.diff`).
