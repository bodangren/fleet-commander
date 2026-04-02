# Go Runtime Archive — Final Decommission

This directory contains the complete Go HTTP server runtime that was archived during the final decommission on 2026-04-02.

## What's Here

- `main.go` — HTTP server entry point (port 8081)
- `*.go` — 23 root-level handler files
- `internal/` — 24 Go packages (~130 files)
- `go.mod`, `go.sum` — Go module definition

## Rollback Procedure

To restore the Go runtime:

```bash
# From the repo root:
git checkout pre-go-decommission-final

# Or manually restore from this archive:
cp -r conductor/archive/_go_runtime_final_20260402/internal/ internal/
cp conductor/archive/_go_runtime_final_20260402/go.mod .
cp conductor/archive/_go_runtime_final_20260402/go.sum .
cp conductor/archive/_go_runtime_final_20260402/*.go .
go build -o fleet-commander .
```

## Replacement

The Go HTTP server has been replaced by:

- **Bun server** (`pivot/src/server.ts`) — All 34 frontend-consumed endpoints
- **Convex functions** (`convex/*.ts`) — All data persistence and queries
- **Router** (`pivot/src/routes/router.ts`) — HTTP route dispatcher

## Rollback Trigger Criteria

- Bun server fails to start on port 8081
- Frontend cannot load data from Bun endpoints
- Convex data layer is unavailable
- WebSocket connections fail on Bun server
