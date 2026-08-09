# Frontend bundle splitting — TD-269

**Status:** Completed (closed 2026-08-09)<br>
**Priority:** High / P1  
**Risk:** Elevated

TD-269 removes the known production bundle advisory with the smallest
evidence-driven route/module split. The core Portfolio, Dashboard, Project,
Sprint Planning, and Board path remains behaviorally reliable; optional
analytics, history, operations, settings, and other heavy tab/page code may
load on demand. This is a delivery-size track, not a product redesign or a
reason to raise Vite's 500 kB warning threshold.

- [Specification](./spec.md)
- [Implementation plan](./plan.md)
- [Test strategy](./test-strategy.md)
- [Metadata](./metadata.json)
- [Closeout](./closeout.md)

Opening evidence is recorded before implementation: the frontend production
build transformed 2,800 modules and emitted a 1,354.26 kB minified JavaScript
chunk (382.84 kB gzip), with Vite's default over-500 kB advisory. The current
data-router statically imports 34 page modules; the graph records 41 outgoing
edges from `frontend/src/router.tsx`. No source, test, package, generated
artifact, or `graph.db` change is part of track setup.

Implementation closed after route/module lazy splitting removed the advisory
without changing Vite's 500 kB threshold or adding `manualChunks`. The final
build still transformed 2,800 modules; its largest JavaScript asset was
436.04 kB minified / 135.39 kB gzip, and every emitted JavaScript chunk was
below 500 kB. Full evidence, including the measured exception that made parts
of the original core eager boundary lazy, is in [Closeout](./closeout.md).
