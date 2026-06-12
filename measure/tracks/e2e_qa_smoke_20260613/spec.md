# Spec: E2E QA/QC Smoke Test (Kimi WebBridge)

## Overview

A end-to-end quality-assurance track that uses **Kimi WebBridge** to drive the user's real browser against the running Fleet Commander app, smoke-testing every user-facing route, button, form, link, and interaction from a user's perspective. The track produces a coverage report, a screenshot archive, and a per-finding tech-debt row.

The track does **not** add new code, schemas, or endpoints. It is a QA discovery process that:

1. **Builds a route/element inventory** by static analysis of `frontend/src/router.tsx` and the page components it references.
2. **Drives the user's real browser** through Kimi WebBridge (`http://127.0.0.1:10086`) — this exercises the full app stack (frontend Vite dev server → pivot Bun backend → Convex) under real conditions with the user's actual login/session state.
3. **Exercises every interactive element** (click, fill, hover, submit, drag) the snapshot exposes on each route, capturing a screenshot per interaction.
4. **Validates expected behavior** (page renders, navigation works, form accepts input, modal opens, toast appears, error message shows, etc.) using page snapshots and DOM evaluation.
5. **Files one tech-debt row per finding** with reproduction steps, screenshot path, and a severity tag.

The track uses **Sprint Mode** — stories map to user-journey groups, each with Gherkin acceptance criteria and T-shirt sizes.

## Scope

- **In scope:** all 38 routes registered in `frontend/src/router.tsx`; all interactive elements (button, link, input, select, textarea, role=button, role=tab, role=menu) on each route; multi-page forms and confirmation dialogs; cross-route navigation (link → page → back); toast and modal lifecycle.
- **Out of scope:** backend unit tests (already covered by pivot/convex suites); mobile-only layouts; the 34 pre-existing Playwright E2E baseline failures (TD-250); performance/load testing.

## Stories

### STORY-Q1: Build the route and element inventory

As a **QA engineer** I want a **machine-readable inventory of every route and its interactive elements** So that the smoke test can drive the browser without missing a button or hard-coding selectors.

- **Estimate:** M
- **Priority:** Must
- **Acceptance Criteria (Gherkin):**
  - **Given** `frontend/src/router.tsx` at HEAD and every page it imports
  - **When** Phase 1 runs the inventory generator
  - **Then** a `route-inventory.md` file is created at `measure/tracks/e2e_qa_smoke_20260613/route-inventory.md` containing one row per route with: path, page component, interactive element count, and a list of `data-testid`/`aria-label` anchors.
  - **And** a `route-inventory.json` machine-readable form is created for use by the executor script.
  - **And** the inventory is regenerable by re-running the generator (idempotent).

### STORY-Q2: Prepare the QA daemon and dev stack

As a **QA engineer** I want the **kimi-webbridge daemon, pivot, frontend, and Convex dev servers all running and reachable** So that the smoke test can navigate to the app and exercise routes.

- **Estimate:** S
- **Priority:** Must
- **Acceptance Criteria (Gherkin):**
  - **Given** the user's machine has Node/Bun/Convex installed
  - **When** Phase 2 runs `npm run dev` in the background and probes each port
  - **Then** `http://localhost:5173` (Vite frontend) returns 200.
  - **And** `http://localhost:8081/api/health` (pivot) returns 200.
  - **And** the Convex dashboard is reachable at the URL stored in `CONVEX_DEPLOYMENT`.
  - **And** `~/.kimi-webbridge/bin/kimi-webbridge status` reports `running:true` and the user has the extension connected in their browser.
  - **And** if any prerequisite is missing, Phase 2 surfaces a clear remediation step and halts (does not skip silently).

### STORY-Q3: Drive every route through the browser

As a **QA engineer** I want **every route to be navigated to, snapshotted, and screenshot-captured** So that I have visual proof each page renders and the inventory is exercised.

- **Estimate:** L
- **Priority:** Must
- **Acceptance Criteria (Gherkin):**
  - **Given** the inventory and running dev stack
  - **When** Phase 3 iterates each route via `kimi-webbridge navigate`
  - **Then** for each route the daemon captures an `a11y snapshot` (refs `@eN`), one full-page screenshot, and the page title.
  - **And** the title matches the expected `route-inventory` page component name.
  - **And** if a route returns 4xx/5xx or fails to render, a finding row is filed with severity High.

### STORY-Q4: Exercise every interactive element

As a **QA engineer** I want **every button, link, input, and form to be clicked, filled, or submitted** So that the smoke test catches broken handlers, dead buttons, and silent failures.

- **Estimate:** XL
- **Priority:** Must
- **Acceptance Criteria (Gherkin):**
  - **Given** the snapshot of a route (refs `@eN` for each interactive element)
  - **When** Phase 4 iterates the element list
  - **Then** each `<button>` and `[role=button]` is clicked and the resulting page is snapshotted.
  - **And** each `<a href>` link is clicked and the resulting page is snapshotted.
  - **And** each `<input>`, `<select>`, and `<textarea>` is filled with a test value (and reverted).
  - **And** each form is submitted and the response is captured.
  - **And** any click that produces a console error, broken navigation, or uncaught exception is filed as a finding (severity High for crashes, Medium for unexpected behavior).
  - **And** a confirmation dialog is acknowledged via its confirm/cancel button (each variant tested).

### STORY-Q5: Validate cross-route navigation and back-button

As a **QA engineer** I want **deep links and back-button behavior to be verified** So that the data-router and BrowserRouter migration is regression-safe.

- **Estimate:** M
- **Priority:** Should
- **Acceptance Criteria (Gherkin):**
  - **Given** the user is on `/portfolio`
  - **When** they click a project card → `/project/:id`
  - **Then** the project page renders without error.
  - **And** clicking the browser back returns to `/portfolio` with state preserved.
  - **And** directly visiting `/project/non-existent-id` renders the not-found path (`*` → `Navigate to /`).
  - **And** `/settings` (index) redirects to `/settings/app`.

### STORY-Q6: Capture findings and file tech-debt rows

As a **QA engineer** I want **every defect discovered to be filed as a structured tech-debt row with reproduction steps and a screenshot** So that the next remediation track has a precise backlog.

- **Estimate:** M
- **Priority:** Must
- **Acceptance Criteria (Gherkin):**
  - **Given** any failed assertion, console error, or unexpected behavior
  - **When** Phase 6 processes the run log
  - **Then** a finding row is appended to `findings.md` with: ID (`Q-FIND-NNN`), route, element, action, expected, actual, severity, screenshot path.
  - **And** the same row is appended to `measure/tech-debt.md` with a `Q-FIND-NNN` ID and a description.
  - **And** a screenshot `.png` is saved under `measure/tracks/e2e_qa_smoke_20260613/screenshots/<route>/<element>.png`.

### STORY-Q7: Produce the coverage report and demo

As a **PM** I want **a coverage report showing route/element pass-rate and a screenshot archive** So that I can demo the QA state and triage the backlog.

- **Estimate:** S
- **Priority:** Should
- **Acceptance Criteria (Gherkin):**
  - **Given** the run log from Phases 3–6
  - **When** Phase 7 generates the report
  - **Then** `coverage-report.md` shows: routes covered, elements exercised, pass/fail/breakdown, severity histogram, top-3 findings, screenshot index.
  - **And** `screenshots/INDEX.md` is a clickable index of every captured screenshot.
  - **And** `metadata.json` is updated with `actual_tasks`, `qa_coverage` (percent), and `findings_count`.

## Functional Requirements

### FR-1: Inventory Generator

- A Node/Bun script reads `frontend/src/router.tsx`, follows the import graph to each page component, and uses `bun build --metafile` (or regex on JSX) to enumerate `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, `[role=button]`, `[role=tab]`, `[role=menu]`, `[data-testid=...]`, `[aria-label=...]`.
- Output: `route-inventory.md` (human) + `route-inventory.json` (machine).
- Script: `measure/tracks/e2e_qa_smoke_20260613/scripts/build-inventory.ts` (commit alongside the inventory).

### FR-2: QA Executor

- A Bun script that wraps the kimi-webbridge HTTP API: starts a `qa-<timestamp>` session, iterates the inventory, calls `navigate` → `snapshot` → `screenshot` per route, and for each `@e` ref calls `click` or `fill` per element type.
- Output: `qa-run-<timestamp>.json` (one entry per action with: route, ref, action, status, screenshot path, error).
- Script: `measure/tracks/e2e_qa_smoke_20260613/scripts/qa-executor.ts`.

### FR-3: Findings Generator

- A Bun script that diffs the run log against the expected inventory, files findings for any missing/extra/broken state, and writes both `findings.md` and tech-debt rows.
- Script: `measure/tracks/e2e_qa_smoke_20260613/scripts/findings-generator.ts`.

### FR-4: Coverage Reporter

- A Bun script that aggregates run logs and renders `coverage-report.md` + `screenshots/INDEX.md`.
- Script: `measure/tracks/e2e_qa_smoke_20260613/scripts/coverage-reporter.ts`.

## Non-Functional Requirements

- **Idempotency:** Re-running the executor against an unchanged inventory must produce the same route list and pass-rate variance ≤ 5%.
- **Isolation:** The QA session does not pollute the user's main browser tabs — uses a dedicated session and `group_title` so the QA tab group is collapsible.
- **Cost ceiling:** Smoke test must complete in under 30 minutes (matches the build-graph audit timeout budget).
- **Privacy:** Screenshots are stored locally under `measure/tracks/e2e_qa_smoke_20260613/screenshots/` and never committed if they contain real user data (the user can scrub before commit).

## Dependencies and Risks

- **Depends on:** kimi-webbridge daemon + extension (user must install and connect), running Convex + pivot + frontend dev servers, inventory generator using `bun build --metafile` (Bun ≥ 1.2).
- **Risk:** Without the extension, the executor halts at STORY-Q2 and produces a `kimi-not-connected` finding (handled gracefully, not a hard error).
- **Risk:** Sites that check `event.isTrusted` will reject synthetic clicks; the executor wraps such elements in `evaluate` fallbacks and files a finding if the fallback also fails.
- **Risk:** If the user's Convex deployment is empty (no projects), several routes will render empty states — these are valid, not defects. The inventory must mark empty-state expectations.
