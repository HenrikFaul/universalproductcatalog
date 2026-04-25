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
