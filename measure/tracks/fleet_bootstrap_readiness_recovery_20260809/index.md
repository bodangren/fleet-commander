# Fleet bootstrap readiness recovery — TD-266

**Status:** Completed 2026-08-09

Make project identity and selection usable without waiting for unrelated agent,
harness, health, settings, or dashboard work, while retaining truthful optional
resource states and the existing read-only route boundaries.

- [Specification](./spec.md)
- [Implementation plan](./plan.md)
- [Closeout](./closeout.md)
- [Test strategy](./test-strategy.md)
- [Metadata](./metadata.json)

Implementation landed in `1a6e8169`. No schema/API expansion, read-side mutation,
generated-file change, package change, seed, route interception, or credentialed
factory action was performed.
