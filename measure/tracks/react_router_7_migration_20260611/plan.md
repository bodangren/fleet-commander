# Plan — React Router 7 Migration

## Phase 1: Inventory & Scaffold
- [ ] Task 1.1: List all Route declarations in `App.tsx` and child route components
- [ ] Task 1.2: Inventory all `useNavigate`, `useParams`, `useLocation`, `useSearchParams` usages
- [ ] Task 1.3: Create `src/router.tsx` with `createBrowserRouter` and empty route tree
- [ ] Task 1.4: Add React Router 7 to `package.json` and resolve peer-dependency warnings

## Phase 2: Route Migration
- [ ] Task 2.1: Convert top-level routes (`/`, `/dashboard`, `/projects`, `/settings`, etc.) to data-router
- [ ] Task 2.2: Convert nested routes (`/projects/:id`, `/sprints/:id`, etc.) with param loaders
- [ ] Task 2.3: Replace programmatic `navigate()` calls with `useNavigate()` v7 patterns
- [ ] Task 2.4: Remove all React Router 6 future flags from `vite.config.ts` or entry files

## Phase 3: Test Validation
- [ ] Task 3.1: Run `npm run typecheck` and fix all router-related type errors
- [ ] Task 3.2: Run `npm run build` and fix build errors
- [ ] Task 3.3: Run `npm run test:unit` and fix broken tests
- [ ] Task 3.4: Run Playwright E2E suite (28 specs) and fix regressions
- [ ] Task 3.5: Manual smoke test — navigate every major route, verify no console errors

## Phase 4: Cleanup & Closeout
- [ ] Task 4.1: Delete dead route components and legacy router wrappers
- [ ] Task 4.2: Update `tech-debt.md` — mark TD-241 as resolved
- [ ] Task 4.3: Commit, push, and archive track
