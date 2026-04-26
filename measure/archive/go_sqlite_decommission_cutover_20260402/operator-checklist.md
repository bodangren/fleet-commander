# Operator Checklist — Go/SQLite Decommission

## Pre-Cutover

- [ ] Verify Bun orchestrator tests pass: `cd pivot && bun test`
- [ ] Verify frontend builds: `cd frontend && bun run build`
- [ ] Verify Go server builds: `go build -o fleet-commander .`
- [ ] Verify Go tests pass: `go test ./...`
- [ ] Confirm git tag `pre-decommission-20260402` exists
- [ ] Review `decommission-scope.md` — confirm ARCHIVE/RETAIN classifications

## Cutover Execution

1. Archive dead code packages:
   ```
   mkdir -p measure/archive/_superseded_go_modules_20260402
   mv internal/analysis measure/archive/_superseded_go_modules_20260402/
   mv internal/coverage measure/archive/_superseded_go_modules_20260402/
   mv internal/harnesses measure/archive/_superseded_go_modules_20260402/
   ```

2. Verify Go server still builds:
   ```
   go build -o fleet-commander .
   ```

3. Verify Go tests still pass:
   ```
   go test ./...
   ```

## Post-Cutover Verification

- [ ] `go build -o fleet-commander .` — no errors
- [ ] `go test ./...` — all tests pass
- [ ] `cd pivot && bun test` — Bun orchestrator tests pass
- [ ] `cd frontend && bun run build` — frontend builds
- [ ] No broken imports: `go vet ./...`

## Rollback Trigger Criteria

- Go server fails to build after archive
- Go tests fail after archive
- Frontend cannot reach Go API endpoints
- Bun orchestrator tests regress

## Rollback Procedure

**Option A — Git revert:**
```bash
git checkout pre-decommission-20260402
```

**Option B — Restore from archive:**
```bash
mv measure/archive/_superseded_go_modules_20260402/analysis internal/
mv measure/archive/_superseded_go_modules_20260402/coverage internal/
mv measure/archive/_superseded_go_modules_20260402/harnesses internal/
```
