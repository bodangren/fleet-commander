# ADR-002: Electron to Vite Pivot

## Status
Accepted (2026-04-02)

## Context
The original Fleet Commander frontend was built as an Electron desktop application with:
- `src/main/`: Electron main process
- `src/preload/`: Preload scripts for IPC bridging
- `src/renderer/`: React UI rendered in Electron window
- Complex build pipeline with `dist/` and `dist-electron/` outputs

This architecture required:
- Native desktop packaging for each platform
- IPC communication between main and renderer processes
- Complex security model for preload scripts
- Slower build times due to Electron bundling

## Decision
Replace Electron with a standalone Vite + React web application served by the Bun backend.

## Rationale
1. **Simpler Architecture**: Single HTTP server serves both API and static frontend assets
2. **Cross-Platform**: Any device with a browser can access the UI
3. **Faster Builds**: Vite alone is significantly faster than Electron bundling
4. **Easier Deployment**: No native packaging needed — just serve static files
5. **Convex Subscriptions**: Web-based approach integrates naturally with Convex real-time subscriptions
6. **Developer Experience**: Standard web development without Electron-specific quirks

## Consequences
- Electron-specific code removed (`src/main/`, `src/preload/`)
- Frontend now a standard Vite SPA in `frontend/` directory
- Bun server (`pivot/src/server.ts`) serves built frontend from `frontend/dist/`
- WebSocket replaced with Convex real-time subscriptions + SSE for server-to-client
- Playwright e2e tests run against the web app instead of Electron

## Migration Notes
- React components largely unchanged (just moved from `src/renderer/` to `frontend/src/`)
- IPC calls replaced with HTTP API calls to Bun server
- File system access moved to backend routes
- Environment variables simplified (no Electron-specific config)
