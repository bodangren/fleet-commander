# React Router 7 Migration

## Problem

The Fleet Commander frontend uses BrowserRouter + manual Route declarations with React Router 6 future flags. React Router 7 introduces a data-router API that enables:

- Loader/action colocation with routes
- Automatic data prefetching and revalidation
- Better TypeScript integration
- Removal of deprecated APIs

Staying on v6 with future flags is accruing migration debt and blocking library upgrades.

## Goal

Migrate the frontend to React Router 7 data-router API with zero regression in the 28 Playwright E2E specs.

## Acceptance Criteria

1. All `BrowserRouter` + `Route` declarations converted to `createBrowserRouter` + route definitions.
2. All React Router 6 future flags removed.
3. All `useNavigate`, `useParams`, `useLocation` calls updated to v7-compatible patterns.
4. `App.tsx` route wiring replaced with data-router configuration.
5. All 28 Playwright E2E specs pass without modification.
6. Build and typecheck succeed.
7. No runtime console errors on navigation.
