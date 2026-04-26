# Specification: Scaffold Go Backend Daemon & Vite Frontend

## Overview
Initialize the completely new architecture for Measure Fleet Commander. We are moving from a single-project React/Electron app to a multi-project Go daemon that serves a Vite/React frontend.

## Goals
- Create the root Go module (`go mod init`).
- Scaffold the basic Go daemon entry point (`main.go`) that starts a basic HTTP server.
- Scaffold the Vite/React frontend in a `frontend/` directory.
- Configure Go to embed or serve the Vite built assets so the entire application can be run as a single binary.
- Clean up the old Node.js/Electron files.

## Acceptance Criteria
- Running `go run main.go` starts a web server on `localhost:8080`.
- Navigating to `localhost:8080` shows the default Vite/React landing page.
- Old Electron dependencies and configs (`src/main`, `src/preload`, `package.json` at root) are removed or safely archived.
