# Tech Stack - Fleet Commander

Fleet Commander runs on a **Bun runtime + Convex backend** architecture.

## 1. Application Runtime (Bun)

- **Runtime:** Bun 1.3+
- **Role:** HTTP API server, cron scheduler for task execution, local CLI harness
- **HTTP Server:** `Bun.serve()` on port 8081
- **Process execution:** `Bun.spawn` for running employee CLI tools
- **Scheduler:** Simple cron loop (no complex dispatcher)

## 2. Canonical Backend (Convex)

- **System of record:** Projects, sprints, tasks, employees, runs, settings
- **Simplified schema:** No dispatcher state, no broker issues, no scoring tables
- **Realtime:** Convex subscriptions for live kanban updates
- **Type generation:** `convex/_generated/*` checked into repo

## 3. Frontend

- **Framework:** React 19 + Vite
- **UI:** Single-page kanban application
- **Styling:** Tailwind CSS + shadcn/ui
- **Data:** Convex subscriptions + Bun API endpoints

## 4. Developer Workflow

1. Start Convex dev: `npx convex dev`
2. Start Bun server: `bun --cwd pivot dev` (port 8081)
3. Start frontend: `bun --cwd frontend dev` (port 5173)
4. Run tests: `bun --cwd pivot test && bun --cwd frontend test`
5. Run scheduler manually: `./measure/automation-script.sh`
