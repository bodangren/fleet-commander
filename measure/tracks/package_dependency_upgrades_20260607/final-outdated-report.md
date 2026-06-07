# Final Outdated Report

_Generated: 2026-06-07_

## bun outdated --recursive --no-cache

```
$ bun outdated --recursive --no-cache
| Package                    | Current | Update | Latest | Workspace                 |
|----------------------------|---------|--------|--------|---------------------------|
| react-router-dom           | 6.30.4  | 6.30.4 | 7.17.0 | kanban-conductor-frontend |
| @eslint/js (dev)           | 9.39.4  | 9.39.4 | 10.0.1 | kanban-conductor-frontend |
| @vitejs/plugin-react (dev) | 5.2.0   | 5.2.0  | 6.0.2  | kanban-conductor-frontend |
| eslint (dev)               | 9.39.4  | 9.39.4 | 10.4.1 | kanban-conductor-frontend |
| tailwindcss (dev)          | 3.4.19  | 3.4.19 | 4.3.0  | kanban-conductor-frontend |
| typescript (dev)           | 5.9.3   | 5.9.3  | 6.0.3  | kanban-conductor-frontend |
| vite (dev)                 | 7.3.5   | 7.3.5  | 8.0.16 | kanban-conductor-frontend |
| typescript (dev)           | 5.9.3   | 5.9.3  | 6.0.3  | fleet-pivot-bun-convex    |
```

All current versions match their update target (compatible batch is fully
applied). The remaining major-version gaps are intentionally deferred.

## Intentionally deferred packages

| Package | Current | Latest | Blocker | Follow-up |
|---------|---------|--------|---------|-----------|
| react-router-dom | 6.30.4 | 7.17.0 | Framework-level rewrite, 2-3 days | TD-241 |
| tailwindcss | 3.4.19 | 4.3.0 | Rust engine migration, 3-4 days | TD-242 |
| vite | 7.3.5 | 8.0.16 | Blocked on vite-plugin-pwa Vite 8 peer | TD-243 |
| eslint | 9.39.4 | 10.4.1 | Blocked on eslint-plugin-react compat | TD-244 |
| typescript | 5.9.3 | 6.0.3 | Typecheck triplet + Convex codegen, 2-3 days | TD-245 |
