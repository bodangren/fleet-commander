# Fleet Commander

A local-first autonomous development team orchestrator. Manages AI agents across multiple software projects with intelligent dispatch, structured execution, and full traceability.

## Overview

Fleet Commander transforms independent AI CLI tools into a coordinated, budget-aware development team:

1. **Plan** — Human defines tracks and tasks via the Measure framework
2. **Dispatch** — Intelligent scoring engine selects the best next task
3. **Execute** — AI agent executes via its CLI tool (opencode)
4. **Track** — All state persisted in Convex; progress visible in real-time UI
5. **Review** — Automated validation and human oversight
6. **Learn** — Circuit breakers, coverage enforcement, and policy stats improve over time

## Tech Stack

- **Runtime:** Bun (JavaScript/TypeScript)
- **Backend:** Bun HTTP server with Convex client
- **State:** Convex (canonical database with real-time subscriptions)
- **Frontend:** React 19 + Vite + Tailwind CSS + Shadcn UI
- **Agents:** Opencode via `@opencode-ai/sdk` (persistent sessions); other harnesses via external CLI profiles
- **Orchestration:** Policy-driven dispatch with adaptive scoring

## Project Structure

```
pivot/                  # Bun backend server and orchestrator
  src/
    server.ts           # HTTP server entry point
    routes/             # API route handlers
    orchestrator/       # Task dispatch and execution engine
    policy/             # Scoring, constraints, and economic controls
    git/                # Git integration (branch, commit, push)
    harness/            # Agent harness management
    convexClient.ts     # Convex HTTP client setup
frontend/               # React + Vite UI
  src/
    pages/              # Page components
    components/         # Reusable UI components
    hooks/              # Convex data hooks
    lib/                # Utilities and helpers
convex/                 # Convex schema and server functions
  schema.ts             # Database schema
  _generated/           # Auto-generated Convex types
measure/                # Product specs and development tracks
  tracks/               # Active work tracks
  tracks.md             # Master track registry
```

## Development

```bash
# Install dependencies (uses Bun workspaces)
bun install

# Start all services (Convex dev, pivot server, frontend)
npm run dev

# Or start individually:
npm run pivot:dev       # Bun server on :8081
npm run frontend:dev    # Vite dev server
npx convex dev          # Convex local deployment

# Testing
bun --cwd pivot test           # Pivot unit tests
bun --cwd frontend test        # Frontend unit tests
bun --cwd frontend test:e2e:mocked  # Isolated UI journeys with mocked API state
bun --cwd frontend test:e2e:live    # Fail-closed Vite → Pivot → Convex browser journey

# Lint and type check
bun --cwd pivot typecheck
bun --cwd frontend check

# Run orchestrator manually
bun --cwd pivot orchestrator:once
```

## Environment Variables

Create `.env.local` in project root:

```bash
CONVEX_DEPLOYMENT=your-deployment-url
```

Convex local deployment state is stored under `.convex/local/` for this
checkout. If schema validation reports data from another project, back up or
remove `.convex/local/default/` and rerun `npx convex dev`.

The optional Postgres Compose service maps to host port `55432` by default to
avoid collisions with other local projects using the standard `5432` port.
Override it with `CONVEX_POSTGRES_PORT` if you need a different host port.

## License

ISC
