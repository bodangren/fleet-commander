# Test strategy: Historical notification data disposition

## Evidence layers

1. **Read-only persistence evidence** maps table names to current internal IDs through `_indexes`,
   then reads `table_summary_v2`. Both must report `numValues: 0` and zero stored size. This evidence
   is local/deployment-specific and belongs in the track record, not production code.
2. **Source/schema contracts** fail before implementation and then require complete absence of both
   tables, their notification-only validators/types, every retired runtime surface, and stale Doctor
   allowlist paths.
3. **Convex runtime/typecheck/full tests** prove the smaller schema compiles and supported functions
   still execute through registered references.
4. **Full clean project gates** protect Pivot/frontend behavior and expose order/env dependencies.
5. **Real system Chrome** proves retired URLs remain truthful and the live app makes no notification
   request or mutation after the schema update.

## Data-safety contract

- SQLite is opened read-only. Never update `.convex/local/default/convex_local_backend.sqlite3` by
  direct SQL and never commit it.
- Do not add a migration when the only configured deployment contains zero rows; code deletion is
  the smaller outcome.
- Do not treat local evidence as remote evidence. A different deployment must repeat the count check
  before applying the commit. No remote deployment or credential is configured here.
- If either count becomes nonzero before implementation, stop schema deletion and replace the plan
  with a separately approved export/batched-delete migration.

## Red/green contract

The first test edit changes the existing TD-264 contract from “tables temporarily present” to
“tables and vocabulary absent.” It must fail against the pre-implementation schema. Green requires:

- no `notifications:` or `notificationPreferences:` table declarations;
- no `notificationType`, `notificationChannel`, `NotificationType`, or `NotificationChannel` export;
- no retired public/internal API, Pivot/frontend surface, emitter, or allowlist entry;
- Alerts, task history/state, recovery evidence, and logs still wired;
- browser proof remains mock-free and mutation-free.

## Browser command

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  bun run --cwd frontend test:e2e:live -- e2e/notification-retirement-live.spec.ts --workers=1
```

The browser journey must use the existing running local stack and system Chrome. Browser-harness,
Kimi WebBridge, route interception, `seedScenario`, and credentialed factory acceptance are banned.
