# Changelog

## [1.3.0] - 2026-04-25
- Added lifecycle/effective-dating helpers (`valid_from` / `valid_to`) and major/minor version operations.
- Extended schema to ensure soft-delete and context-date query compatibility.
- Added edge-case notes for time-travel and version overlap protection.

## [1.2.0] - 2026-04-25
- Added event-driven rules engine supporting REQUIRES, EXCLUDES and CONSTRAINS semantics.
- Added UI integration hooks for disabled states and error rendering.

## [1.1.0] - 2026-04-25
- Added secure AST-based formula evaluator for attribute-based pricing.
- Added price books and override waterfall resolution.
- Added performance and regression coverage for pricing flow.

## [1.0.0] - 2026-04-25
- Implemented EPC core relational schema with JSONB dynamic attributes.
- Implemented dynamic grouped form renderer with loading/empty/error states.
- Added security helpers for dynamic JSON mutation and payload sanitization.
