# Notification data disposition — TD-265

Complete the deletion started by TD-264 without inventing a migration or risking retained data.
The local Convex persistence store proves both retired tables contain zero documents, so this track
removes their schema declarations and notification-only validator vocabulary, then re-proves the
smaller app in clean checks and real Chrome.

- [Specification](./spec.md)
- [Implementation plan](./plan.md)
- [Test strategy](./test-strategy.md)
- [Metadata](./metadata.json)

This track has no public notification API, compatibility path, data-writing migration, replacement
delivery product, or credentialed software-factory mutation.
