# ADR-001: Go Backend Decommission

## Status
Accepted (2026-04-02)

## Context
The original Fleet Commander backend was written in Go (`backend/` directory) with:
- `net/http` server
- `fsnotify` file watcher for Markdown artifacts
- `os/exec` process management for agent CLI tools
- `gorilla/websocket` for real-time streaming
- Embedded SQLite for global state

The Go backend served us well for initial prototyping but became a bottleneck as we needed:
- Tighter integration with Convex (our chosen state platform)
- Unified language stack for easier maintenance
- Better package ecosystem for LLM integrations
- Faster iteration cycles

## Decision
Decommission the Go backend and replace it with a Bun (JavaScript/TypeScript) runtime.

## Rationale
1. **Convex Integration**: JavaScript/TypeScript has first-class Convex SDK support
2. **Developer Velocity**: Team is more productive in TypeScript than Go
3. **Package Ecosystem**: npm/bun registry has richer LLM tooling libraries
4. **Unified Stack**: Same language for frontend (React) and backend reduces context switching
5. **Hot Reload**: Bun's `--watch` mode enables fast development iteration

## Consequences
- Go backend code archived in `backend/` (retained for reference, not compiled)
- All HTTP endpoints reimplemented in `pivot/src/routes/`
- File watcher logic replaced with Convex real-time subscriptions
- SQLite state migrated to Convex tables
- WebSocket code simplified using Bun's native WebSocket support

## Migration Notes
- Orchestrator logic ported module-by-module to `pivot/src/orchestrator/`
- Go tests translated to Vitest (Bun's test runner)
- CI/CD pipeline updated to use Bun instead of Go toolchain
