# Implementation Plan - Settings & Configuration Page

## Phase 1: Backend Config Schema and API

- [x] Task: Define config schema in `internal/config/config.go`
  - [x] Create `AppConfig` struct with `General`, `Harness`, `WebSocket` sub-structs.
  - [x] Fields: `DefaultAgent`, `OrchestratorInterval`, `LogRetentionDays`, `CacheTTL`, `DefaultHarness`, `WSReconnectInterval`.
  - [x] Add JSON tags and validation tags.
  - [x] Provide `DefaultConfig()` returning sensible defaults.
- [x] Task: Implement `ConfigManager` with file persistence
  - [x] `Load()` reads `~/.conductor/config.json`, returns defaults if missing.
  - [x] `Save()` writes config atomically (write to temp, rename).
  - [x] `Get()` / `Set()` for partial updates with merge.
- [x] Task: Register settings API routes in `main.go`
  - [x] `GET /api/settings` — returns current config.
  - [x] `PUT /api/settings` — accepts partial config, validates, saves, returns updated config.
- [x] Task: Write tests for ConfigManager and API
  - [x] Test load/create default on missing file.
  - [x] Test partial update preserves unspecified fields.
  - [x] Test validation rejects invalid values (negative interval, zero retention).
  - [x] Test HTTP handlers with mock config manager.

## Phase 2: Settings Page Frontend

- [x] Task: Create `SettingsPage` component at `src/renderer/pages/Settings.tsx`
  - [x] Fetch config from `GET /api/settings` on mount.
  - [x] Render four sections: General, Harness, WebSocket, with labeled input fields.
  - [x] Use Shadcn/ui `Input`, `Select`, `Button`, `Toast` components.
- [x] Task: Add save handler
  - [x] On save, call `PUT /api/settings` with changed fields.
  - [x] Show success toast on 200, error toast on validation failure.
- [x] Task: Register `/settings` route and sidebar link
  - [x] Add route in router config.
  - [x] Add "Settings" item to AppLayout sidebar with gear icon.

## Phase 3: Wire Settings into Runtime Behavior

- [x] Task: Orchestrator reads interval from config
  - Added `AutoRunner` that periodically triggers `orch.Run()` for all projects.
  - Interval re-read from config on each tick so changes take effect without restart.
- [x] Task: Log cleanup respects retention setting
  - Added `Logger.SetRetention(d time.Duration)` method.
  - `applyConfigToRuntime` sets retention on all project loggers from config.
- [x] Task: Harness cache uses TTL from config
  - Added `DiscoveryService.SetCacheTTL(ttl time.Duration)` method.
  - `applyConfigToRuntime` sets cache TTL from config.
- [x] Task: WebSocket client uses reconnection interval from config
  - `useWebSocket` hook fetches `/api/settings` on mount and uses `websocket.reconnectInterval`.
  - Auto-reconnect on close with configurable delay.

## Phase 4: Verification

- [x] Task: Run full test suite (`go test ./...` + `npm run test:renderer`)
- [x] Task: Manual verification
  - Open `/settings`, change orchestrator interval to 10s, save.
  - Confirm orchestrator tick interval updates without restart.
  - Change log retention, verify old logs are pruned at new threshold.
  - Refresh page, confirm settings persist.
- [x] Task: Update `conductor/tracks/settings_config_page_20260330/plan.md` with completion status
