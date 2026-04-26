Hierarchy studio only-patch

Included files:
- app/catalogs/[slug]/hierarchy/HierarchyBuilderClient.jsx
- app/catalogs/[slug]/hierarchy/HierarchyBuilderClient.module.css

What this patch changes:
- moves the visual hierarchy into a full-width bottom section
- removes the narrow middle-strip canvas layout
- scales the graph to fit the available width so the structure can be seen whole without horizontal scrolling
- drag from palette into the canvas now opens a relation builder modal
- dropping on a node prefills the parent product in the modal
- dropping on empty canvas lets the user choose the parent manually
- adds a minus action on removable bundle child nodes for fast deletion
- keeps manual relationship editing in the inspector and syncs both visual/manual flows to the same bundle edge state

Scope discipline:
- no route changes
- no backend contract changes
- bundle edge persistence remains on the existing API route
- service/resource decomposition remains read-only and visible
