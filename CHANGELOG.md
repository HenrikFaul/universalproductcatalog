# Changelog

## [3.6.0] - 2026-04-26
- Reworked the main layout and catalog builder into a light Enterprise SaaS UI theme.
- Removed dark card/hero/input backgrounds that caused unreadable contrast.
- Added responsive grid safeguards, sticky builder sidebar overflow control and accessible focus/hover states.
- Kept backend, persistence, data and API behavior unchanged; UI-only CSS/token update.

## [2.4.0] - 2026-04-25
- Added 6 industry payload examples (Telecom, Automotive, Banking, Logistics, Brewery, Optics).
- Added cross-industry compatibility validator for biological and physical conflicts.

## [2.3.0] - 2026-04-25
- Extended rules engine with working-memory tracking and ELIGIBILITY rule type.
- Added latency reporting for event-driven rule evaluation.

## [2.2.0] - 2026-04-25
- Extended pricing model to support FLAT_FEE, PER_UNIT, TIERED and ATTRIBUTE_BASED methods.
- Added decision-matrix price book selection and waterfall override chaining.

## [2.1.0] - 2026-04-25
- Added UUID defaults and GIN/GIST indexing enhancements in DDL.
- Added schema-driven UI field filtering (`configurable`) and validation extraction.

## [2.0.0] - 2026-04-25
- Added TMF620-inspired headless API scaffolding and inheritance chain helpers.
- Added specification/resource/service model separation and BOM cardinality schema.

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

## [3.5.0] - 2026-04-25
- Added InsurTech risk-profile payload and underwriting helpers for C00-C97 decline and referral flow.
- Added actuarial premium computation helper with runtime biometric multipliers.

## [3.4.0] - 2026-04-25
- Added optical prescription payload and precise (scaled-integer) grid pricing lookup utility.
- Strengthened dynamic form accessibility with 44px tap targets and higher-contrast error states.

## [3.3.0] - 2026-04-25
- Added brewery payload for `SPEC-HOPS-PELLETS` and AST-aligned net-price formula helper.
- Added tests for shelf-life/quality-oriented vertical pricing behavior.

## [3.2.0] - 2026-04-25
- Added logistics payload for refrigerated cargo and ABP helper for distance/weight/temp/fuel multipliers.
- Extended rules engine with constraint action outputs for truck-allocation recommendations.

## [3.1.0] - 2026-04-25
- Added mortgage helper functions for PMT annuity calculation, LTV ratio, and conditional premium account fee waiver.
- Extended rules engine for JTM eligibility hard-stop and REQUIRES auto-add output handling.
- Added EPC bundle metadata for home-buyer, cold-chain, brewery, optics, and life/health policy bundles.
