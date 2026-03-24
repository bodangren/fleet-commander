# Implementation Plan - Scaffold Go & Vite

## Phase 1: Clean Slate & Initialization
- [x] Task: Delete existing `src/main`, `src/preload`, and Electron-specific config files.
- [x] Task: Move existing `src/renderer` to `frontend/`.
- [x] Task: Initialize Go module (`go mod init github.com/conductor/fleet-commander`).

## Phase 2: Go Web Server
- [x] Task: Create `main.go` with a basic `net/http` server.
- [x] Task: Configure Go server to serve static files from `frontend/dist`.
- [x] Task: Add a simple `/api/health` JSON endpoint to verify the backend is alive.

## Phase 3: Frontend Adjustments
- [x] Task: Update `vite.config.ts` in `frontend/` to proxy API requests to the Go backend during development.
- [x] Task: Strip out Electron IPC calls from the frontend React code and replace with standard `fetch` to `/api/health`.

## Phase 4: Build Pipeline
- [x] Task: Create a `Makefile` or basic shell script to build the Vite frontend and compile the Go binary in one step.
