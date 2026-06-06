# hooks/test/fake-gates — Shared Test Harness

Test stubs that replace each quality-gate command in shell tests, so neither
the verify entrypoint (Phase 1) nor the pre-push hook (Phase 2) has to run
real pivot/convex/frontend suites in CI or during development.

## Stubs

Six tiny shell scripts, one per gate:

| Stub | Real command (per measure/tracks/quality_gate_enforcement_20260605/plan.md) |
|---|---|
| `pivot-test` | `bun --cwd pivot test` |
| `convex-test` | `bun test $(find convex -name '*.test.ts' \| sed 's\|^|./\|')` |
| `frontend-test` | `bun --cwd frontend test` |
| `pivot-typecheck` | `bun --cwd pivot typecheck` |
| `frontend-check` | `bun --cwd frontend check` |
| `doctor` | `./measure/doctor.sh all` |

## Contract

Each stub is a thin wrapper around `_lib.sh`'s `run_fake_gate`:

- **Exit code**: `$FAKE_<GATE_UPPER>_EXIT` (default `0`).
- **Invocation log**: appends `<gate>` (tab) `<args...>` to
  `$FAKE_<GATE_UPPER>_LOG` (default `/dev/null`) so tests can assert
  order and captured command lines.
- **Stdout**: prints the same `<gate>` / `<args>` line so the verify
  script can capture per-gate output for its summary.

`<GATE_UPPER>` is the gate name uppercased with `-` replaced by `_`.
For example, `pivot-test` → `FAKE_PIVOT_TEST_EXIT`, `frontend-check` → `FAKE_FRONTEND_CHECK_EXIT`.

## How a test uses the harness

```bash
LOG_DIR=$(mktemp -d)
export VERIFY_FAKE_GATE_DIR="$REPO_ROOT/hooks/test/fake-gates"

for gate in pivot-test convex-test frontend-test pivot-typecheck frontend-check doctor; do
  key="${gate^^}"; key="${key//-/_}"
  export "FAKE_${key}_EXIT"="0"
  export "FAKE_${key}_LOG"="$LOG_DIR/${gate}.log"
done

./measure/verify.sh   # picks up the stubs via VERIFY_FAKE_GATE_DIR
```

`measure/tests/verify.test.sh` is the canonical consumer and a working
example for the next phase.
