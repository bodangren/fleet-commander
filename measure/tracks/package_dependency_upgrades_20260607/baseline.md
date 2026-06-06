# Pre-Upgrade Baseline — 2026-06-07

## Environment

```
$ bun --version
1.3.14
```

### Root packageManager

```json
"packageManager": "bun@1.3.10"
```

The root `package.json` declares `bun@1.3.10` while the development runtime is
Bun `1.3.14`. This drift is addressed in Phase 3 (FR-3).

---

## Workspace Manifests

### Root (`package.json`)

```json
{
  "name": "kanban-conductor",
  "private": true,
  "packageManager": "bun@1.3.10",
  "workspaces": ["pivot", "frontend"],
  "dependencies": {
    "convex": "^1.34.1"
  },
  "devDependencies": {
    "concurrently": "^9.2.1"
  }
}
```

### Pivot (`pivot/package.json`)

```json
{
  "name": "fleet-pivot-bun-convex",
  "private": true,
  "type": "module",
  "dependencies": {
    "@opencode-ai/sdk": "^1.14.35",
    "convex": "^1.34.1",
    "js-yaml": "^4.1.1",
    "mdast-util-to-string": "^4.0.0",
    "remark-parse": "^11.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "bun-types": "^1.3.10",
    "typescript": "^5.9.3"
  }
}
```

### Frontend (`frontend/package.json`)

```json
{
  "name": "kanban-conductor-frontend",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.4",
    "@types/js-yaml": "^4.0.9",
    "@xyflow/react": "^12.10.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "convex": "^1.34.1",
    "js-yaml": "^4.1.1",
    "lucide-react": "^0.562.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "react-router-dom": "^6.30.1",
    "recharts": "^3.8.1",
    "tailwind-merge": "^3.4.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.2",
    "@playwright/test": "^1.59.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.2.8",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.2",
    "@vitest/coverage-v8": "^4.1.4",
    "@vitest/ui": "^4.0.17",
    "autoprefixer": "^10.4.23",
    "eslint": "^9.39.2",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^7.0.1",
    "jsdom": "^27.4.0",
    "playwright": "^1.59.1",
    "postcss": "^8.5.6",
    "prettier": "^3.8.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.53.0",
    "vite": "^7.3.1",
    "vite-plugin-pwa": "^1.2.0",
    "vitest": "^4.0.17"
  }
}
```

---

## `bun outdated --recursive --no-cache`

Command: `bun outdated --recursive --no-cache`

36 upgradeable workspace entries across root, pivot, and frontend. Results
captured on 2026-06-07 with Bun 1.3.14.

> Full verbatim output omitted for brevity; the entry count and per-package
> targets are recorded in `compatible-matrix.md`.

---

## `bun audit`

Command: `bun audit`

**14 vulnerabilities total: 7 high, 7 moderate.**

### High-severity findings

| # | Package              | Vulnerability                  | Path                                              |
|---|----------------------|--------------------------------|---------------------------------------------------|
| 1 | `vite`               | Path traversal / file read     | frontend > vite                                   |
| 2 | `serialize-javascript`| RCE via crafted input         | frontend > vite > @vitejs/plugin-react            |
| 3 | `fast-uri`           | ReDoS                          | frontend > vite-plugin-pwa > workbox-*            |
| 4 | `@babel/traverse`    | Prototype pollution            | frontend > vite-plugin-pwa > workbox-build        |
| 5 | `postcss`            | Parse abuse / source leak      | frontend > tailwindcss > postcss                  |
| 6 | `braces`             | ReDoS                          | frontend > vite > chokidar > braces               |
| 7 | `micromatch`         | ReDoS                          | frontend > vite > chokidar > micromatch            |

### Moderate-severity findings

| # | Package              | Vulnerability                  | Path                                              |
|---|----------------------|--------------------------------|---------------------------------------------------|
| 1 | `ws`                 | ReDoS via Sec-WebSocket header | pivot > jsdom > ws                                |
| 2 | `ws`                 | ReDoS via Sec-WebSocket header | frontend > jsdom > ws                             |
| 3 | `brace-expansion`    | ReDoS                          | frontend > eslint > file-entry-cache > glob       |
| 4 | `brace-expansion`    | ReDoS                          | frontend > typescript-eslint > brace-expansion    |
| 5 | `nanoid`             | Predictable ID generation      | frontend > postcss > nanoid                       |
| 6 | `source-map-js`      | Source map injection           | frontend > postcss > source-map-js                |
| 7 | `rollup`             | Prototype pollution via AST    | frontend > vite > rollup                          |

---

## `npm run verify` — Pre-existing Failures

Command: `npm run verify`

```
Running pivot-test...        FAIL (exit 127 — bun not on PATH in CI)
Running convex-test...       FAIL (exit 1  — shell glob expansion issue)
Running frontend-test...     FAIL (exit 127 — bun not on PATH in CI)
Running pivot-typecheck...   FAIL (exit 127 — bun not on PATH in CI)
Running frontend-check...    FAIL (exit 127 — bun not on PATH in CI)
Running doctor...            FAIL
  - Check 1: 'as any' guard — 74 usages in production code
  - Check 2: Boundary dependency — 5 cross-slice imports
  - Check 5: Orphan detection — 48 orphaned exports
```

### Pre-existing red gates (not caused by package upgrades)

1. **pivot-test**: `bun` command not available in CI environment (exit 127).
   Owned by environment setup, not this track.
2. **convex-test**: Shell glob expansion syntax error in `verify.sh`. Owned by
   the `quality_gate_enforcement_20260605` track.
3. **frontend-test**: Same `bun` PATH issue as pivot-test.
4. **pivot-typecheck**: Same `bun` PATH issue.
5. **frontend-check**: Same `bun` PATH issue.
6. **doctor — 'as any' guard**: 74 `as any` usages across pivot and frontend.
   Owned by code-quality tracks.
7. **doctor — Boundary dependency**: 5 cross-slice imports (frontend → convex).
   Owned by architecture tracks.
8. **doctor — Orphan detection**: 48 orphaned exports. Owned by cleanup tracks.

**None of the above are attributable to the package upgrade batch in this
track.** Future phases will compare against this baseline to detect regressions
introduced by dependency changes.
