Hierarchy studio redesign only-patch.

Files included:
- app/catalogs/[slug]/hierarchy/HierarchyBuilderClient.jsx
- app/catalogs/[slug]/hierarchy/HierarchyBuilderClient.module.css
- components/ui/Tabs.jsx
- app/styles/design-system.css
- app/styles/tokens.css

What changed:
- node-based hierarchy studio layout
- drag product chips from palette onto product nodes to create bundle edges
- drag product nodes to reposition the visual graph
- inspector tabs for overview / relationships / characteristics
- real-time graph refresh when relationships are edited manually in the inspector
- characteristic counts and summaries reflected on nodes and in inspector
- token-based visual system extension only; no backend contract changes

Persistence behavior preserved:
- bundle edges still save through /api/catalogs/[slug]/hierarchy
- service/resource edges remain read-only, derived from service mapping
