# Current Directive

Primary focus:

- Stabilize the post-rewrite Bun + Convex control plane before adding new product surface area.
- Fix production wiring gaps found in the 2026-06-18 review: quality workflow hot-path hooks, Operations API contracts, and graph/context governance.
- Keep Fleet Commander as a single-scheduler system: Bun AutoRunner is production, Convex is canonical state, Measure files are planning/audit artifacts.
- Continue to require focused frontend and pivot tests for any route, page, or orchestrator wiring change.

Operational notes:

- Treat `measure/tech-debt.md` as curated working memory and remove resolved items promptly.
- Prefer durable track artifacts over ad hoc notes when a decision affects future autonomous runs.
- Do not modify `measure/automation-supervisor.py`; it is a deprecated reference and centrally managed.
