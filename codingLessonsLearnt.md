# Coding Lessons Learnt

## 2026-04-25
1. Governance files referenced by prompt (`AI_DEVELOPER_PROMPTING_MASTER_MANIFESTO.md`, `design-master-rules_en.md`) were missing in repository; implementation proceeded with explicit fallback documentation.
2. Tiered quantity discounts were intentionally left as a future extension in pricing overrides; current waterfall supports ABSOLUTE, DELTA, and PERCENT only.
3. Effective-dating requires strict overlap prevention in write path; helper methods now close old record before creating a new major version.
4. JSON dynamic attribute writes must sanitize keys to avoid prototype pollution and enforce role checks consistently.
5. Event-driven rule evaluation should scope to impacted nodes only (`changedNodeId`) to keep execution below 100 ms under typical catalog sizes.
6. For Next.js deployment on Vercel, public Supabase keys must use `NEXT_PUBLIC_*`; `VITE_*` prefixes should not be mixed in Next projects.
7. Decision-matrix pricing works best when price books contain monotonic decision scores so binary search can select deterministic candidates.
8. Cross-industry compatibility testing can be kept generic by validating conflicts through metadata-driven rules instead of industry-specific backend branches.
9. Mortgage and actuarial formulas should return rounded currency outputs at function boundaries to avoid tiny floating residuals in UI and validations.
10. Grid pricing for optical SPH/CYL works more reliably when values are converted to scaled integers before range matching.
11. Rules output benefits from carrying both `errors` and `actions` so constraint-side effects (like truck split allocations) are explicit and testable.
12. Mobile-first accessibility can be improved globally by setting minimum 44px control height and reinforced invalid-state outlines.

## 2026-04-26
1. Avoid mixing dark translucent backgrounds with slate text in the catalog shell; global page, card, table, form and builder styles must remain light by default.
2. Builder sidebars with long template lists need sticky overflow control and a single-column responsive fallback to prevent inaccessible controls on laptop viewports.
3. Shared design-system button tokens must be checked together with page-level classes so primary and secondary controls keep readable contrast after theme changes.

## 2026-04-26 - Critical catalog clone/import/hierarchy fixes
1. Catalog cloning must never reuse the source slug or only shallow-copy JSON blobs; even in a JSONB-backed runtime table, all internal TMF620 code/id references should be remapped through one ID map before insertion.
2. Supabase slug conflicts should be resolved before POST by querying for candidate uniqueness; relying on duplicate-key errors creates a poor UX and makes clone/import flows look broken.
3. A JSON export feature should have a reverse import path with strict shape validation before mutating editor state; accept both exported productSpecifications and starterProducts-style blueprints.
4. Hierarchy Studio belongs inside catalog context, not global navigation, because catalog_id/slug is required to interpret and persist relationships safely.
5. Hierarchy graph edits must be immutable and optimistic: clone edge arrays before setting state, persist asynchronously, confirm from server response, and rollback the previous state on failure.
6. Product→service and service→resource mappings must be persisted together with bundle hierarchy edges; rebuilding state from only bundle edges drops visual relationships and causes graph/database drift.
7. Long structure palettes should be grouped in default-collapsed accordion sections with counts to reduce cognitive load and avoid unusable sidebars on laptop viewports.

## 2026-04-26 - Hierarchy Studio spatial/DnD/node lifecycle hardening
1. A hierarchy canvas must not render every catalog definition by default; it should render active hierarchy/root nodes only, while the palette remains the source for available definitions. Otherwise relationship deletion leaves misleading orphan nodes on screen.
2. Visual root nodes and intentionally removed nodes need their own persisted UI state in metadata; edge persistence alone cannot distinguish between an empty hierarchy and a deliberately removed root node.
3. Node-level action icons must call `stopPropagation()` and be excluded from pointer-drag handlers, otherwise settings/delete clicks can accidentally start node drag or selection flows.
4. Re-parenting should be implemented as an immutable relationship upsert: remove the child’s previous incoming edge, validate the new parent/child lane, prevent bundle cycles, then persist and rollback as one unit.
5. Destructive node removal should use an explicit confirmation modal and remove descendants by default to avoid creating new orphan branches.
6. Drag-and-drop creation needs both a pending modal payload and a final submit handler that updates state, persists, closes the modal, and reports success; missing any one of these steps makes the UI appear inert.
7. Large enterprise graph editors should use side-by-side palette/canvas layouts and local scroll containers to preserve viewport space on laptop resolutions.
