# Compatible Upgrade Matrix — 2026-06-07

This matrix lists every outdated direct dependency with its current declared
version, the compatible (semver-range) target, and the latest available major.
Entries are tagged:

- **routine** — minor/patch within the declared semver range.
- **security-motivated** — the upgrade is driven by a `bun audit` finding.
- **breaking** — requires a major-version migration (covered in
  `breaking-decisions.md`).

---

## Shared Workspace Packages (FR-4)

### `convex` — aligned across root, pivot, and frontend

| Workspace  | Current    | Compatible Target | Latest Major | Tag               |
|------------|------------|-------------------|--------------|---------------------|
| root       | ^1.34.1    | ^1.34.1 → latest  | 1.x          | routine             |
| pivot      | ^1.34.1    | ^1.34.1 → latest  | 1.x          | routine             |
| frontend   | ^1.34.1    | ^1.34.1 → latest  | 1.x          | routine             |

### `js-yaml` — aligned across pivot and frontend

| Workspace  | Current    | Compatible Target | Latest Major | Tag               |
|------------|------------|-------------------|--------------|---------------------|
| pivot      | ^4.1.1     | ^4.1.1 → latest   | 4.x          | routine             |
| frontend   | ^4.1.1     | ^4.1.1 → latest   | 4.x          | routine             |

---

## Root Workspace

| Package        | Current  | Compatible Target | Latest Major | Tag         |
|----------------|----------|-------------------|--------------|-------------|
| `concurrently` | ^9.2.1   | ^9.2.1 → 9.x      | 10.x         | breaking    |

---

## Pivot Workspace — Runtime Dependencies

| Package            | Current    | Compatible Target | Latest Major | Tag               |
|--------------------|------------|-------------------|--------------|---------------------|
| `@opencode-ai/sdk` | ^1.14.35   | ^1.14.35 → latest  | 1.x          | routine             |
| `convex`           | ^1.34.1    | ^1.34.1 → latest   | 1.x          | routine             |
| `js-yaml`          | ^4.1.1     | ^4.1.1 → latest    | 4.x          | routine             |
| `mdast-util-to-string` | ^4.0.0 | ^4.0.0 → latest  | 4.x          | routine             |
| `remark-parse`     | ^11.0.0    | ^11.0.0 → latest   | 11.x         | routine             |
| `zod`              | ^4.3.6     | ^4.3.6 → latest    | 4.x          | routine             |

## Pivot Workspace — Dev Dependencies

| Package         | Current    | Compatible Target | Latest Major | Tag               |
|-----------------|------------|-------------------|--------------|---------------------|
| `@types/js-yaml`| ^4.0.9     | ^4.0.9 → latest    | 4.x          | routine             |
| `bun-types`     | ^1.3.10    | ^1.3.10 → 1.3.14   | 1.x          | routine             |
| `typescript`    | ^5.9.3     | ^5.9.3 → latest    | 6.x          | breaking            |

---

## Frontend Workspace — Runtime Dependencies

| Package                      | Current    | Compatible Target  | Latest Major | Tag               |
|------------------------------|------------|--------------------|--------------|---------------------|
| `@radix-ui/react-slot`       | ^1.2.4     | ^1.2.4 → latest    | 1.x          | routine             |
| `@types/js-yaml`             | ^4.0.9     | ^4.0.9 → latest    | 4.x          | routine             |
| `@xyflow/react`              | ^12.10.2   | ^12.10.2 → latest  | 12.x         | routine             |
| `class-variance-authority`   | ^0.7.1     | ^0.7.1 → latest    | 0.x          | routine             |
| `clsx`                       | ^2.1.1     | ^2.1.1 → latest    | 2.x          | routine             |
| `convex`                     | ^1.34.1    | ^1.34.1 → latest   | 1.x          | routine             |
| `js-yaml`                    | ^4.1.1     | ^4.1.1 → latest    | 4.x          | routine             |
| `lucide-react`               | ^0.562.0   | ^0.562.0 → 0.x     | 1.x          | breaking            |
| `react`                      | ^19.2.3    | ^19.2.3 → latest   | 19.x         | routine             |
| `react-dom`                  | ^19.2.3    | ^19.2.3 → latest   | 19.x         | routine             |
| `react-router-dom`           | ^6.30.1    | ^6.30.1 → latest   | 7.x          | breaking            |
| `recharts`                   | ^3.8.1     | ^3.8.1 → latest    | 3.x          | routine             |
| `tailwind-merge`             | ^3.4.0     | ^3.4.0 → latest    | 3.x          | routine             |
| `tailwindcss-animate`        | ^1.0.7     | ^1.0.7 → latest    | 1.x          | routine             |

## Frontend Workspace — Dev Dependencies

| Package                      | Current    | Compatible Target  | Latest Major | Tag               |
|------------------------------|------------|--------------------|--------------|---------------------|
| `@eslint/js`                 | ^9.39.2    | ^9.39.2 → latest   | 10.x         | breaking            |
| `@playwright/test`           | ^1.59.1    | ^1.59.1 → latest   | 1.x          | routine             |
| `@testing-library/jest-dom`  | ^6.9.1     | ^6.9.1 → latest    | 6.x          | routine             |
| `@testing-library/react`     | ^16.3.2    | ^16.3.2 → latest   | 16.x         | routine             |
| `@testing-library/user-event`| ^14.6.1    | ^14.6.1 → latest   | 14.x         | routine             |
| `@types/react`               | ^19.2.8    | ^19.2.8 → latest   | 19.x         | routine             |
| `@types/react-dom`           | ^19.2.3    | ^19.2.3 → latest   | 19.x         | routine             |
| `@vitejs/plugin-react`       | ^5.1.2     | ^5.1.2 → latest    | 5.x          | routine             |
| `@vitest/coverage-v8`        | ^4.1.4     | ^4.1.4 → latest    | 4.x          | routine             |
| `@vitest/ui`                 | ^4.0.17    | ^4.0.17 → latest   | 4.x          | routine             |
| `autoprefixer`               | ^10.4.23   | ^10.4.23 → latest  | 10.x         | routine             |
| `eslint`                     | ^9.39.2    | ^9.39.2 → latest   | 10.x         | breaking            |
| `eslint-config-prettier`     | ^10.1.8    | ^10.1.8 → latest   | 10.x         | routine             |
| `eslint-plugin-react`        | ^7.37.5    | ^7.37.5 → latest   | 7.x          | routine             |
| `eslint-plugin-react-hooks`  | ^7.0.1     | ^7.0.1 → latest    | 7.x          | routine             |
| `jsdom`                      | ^27.4.0    | ^27.4.0 → latest   | 29.x         | breaking            |
| `playwright`                 | ^1.59.1    | ^1.59.1 → latest   | 1.x          | routine             |
| `postcss`                    | ^8.5.6     | ^8.5.6 → latest    | 8.x          | routine (security)  |
| `prettier`                   | ^3.8.0     | ^3.8.0 → latest    | 3.x          | routine             |
| `tailwindcss`                | ^3.4.1     | ^3.4.1 → latest    | 4.x          | breaking            |
| `typescript`                 | ^5.9.3     | ^5.9.3 → latest    | 6.x          | breaking            |
| `typescript-eslint`          | ^8.53.0    | ^8.53.0 → latest   | 8.x          | routine (security)  |
| `vite`                       | ^7.3.1     | ^7.3.1 → latest    | 8.x          | breaking (security) |
| `vite-plugin-pwa`            | ^1.2.0     | ^1.2.0 → latest    | 1.x          | routine (security)  |
| `vitest`                     | ^4.0.17    | ^4.0.17 → latest   | 4.x          | routine             |

---

## Summary by Tag

| Tag                 | Count |
|---------------------|-------|
| routine             | 36    |
| security-motivated  | 4     |
| breaking            | 8     |

Breaking-major upgrades are evaluated independently in `breaking-decisions.md`.
