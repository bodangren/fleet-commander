# Implementation Plan: Settings & Polish

## Phase 1: Settings Page

- [x] Task: Build settings page
    - [x] Create `frontend/src/pages/SettingsPage.tsx` (exists)
    - [x] Add general settings form
    - [x] Add notification settings
    - [x] Add save functionality
    - [x] Style with Linear design tokens

## Phase 2: General Settings

- [x] Task: Implement general settings
    - [x] Create `frontend/src/components/settings/GeneralSettings.tsx` (embedded in SettingsPage)
    - [x] Add default agent selector
    - [x] Add scheduler interval input
    - [x] Add log retention selector
    - [x] Add provider cache TTL input

## Phase 3: Notification Settings

- [x] Task: Implement notification settings
    - [x] Create `frontend/src/components/settings/NotificationSettings.tsx` (embedded in SettingsPage)
    - [x] Add checkbox toggles
    - [x] Add save functionality
    - [x] Test notification delivery

## Phase 4: UI Polish

- [x] Task: Apply UI polish
    - [x] Review all components for consistency
    - [x] Add loading skeletons (SettingsPage already has loading state)
    - [x] Add empty state illustrations (EmptyState component exists)
    - [x] Add error boundaries (ErrorBoundary component created)
    - [x] Test responsive design

## Phase 5: Kanban Board Deferred Features (TD-125)

- [x] Task: Implement duration display on active task cards
    - [x] Add duration field to TaskCard component
    - [x] Format duration from run start time to now
    - [x] Style with Linear design tokens
- [x] Task: Add cost/point comparison in sprint info bar
    - [x] Compute actual vs estimated cost per point
    - [x] Display comparison badge in SprintInfoBar
- [x] Task: Implement blocker reason and unblock action
    - [x] Display blocker reason on blocked task cards
    - [x] Add unblock button/menu action
    - [x] Wire to Convex mutation
- [x] Task: Add agent chain visualization
    - [x] Display executor → reviewer → merger chain on merged tasks
    - [x] Use small avatars/badges in TaskCard
- [x] Task: Wire timeline link on merged tasks
    - [x] Add onClick handler to navigate to task timeline
    - [x] Use existing task timeline route

## Phase 6: Accessibility

- [x] Task: Add accessibility features
    - [x] Add ARIA labels (TaskCard listitem, KanbanColumn list, unblock button)
    - [x] Test keyboard navigation
    - [x] Check color contrast
    - [x] Add screen reader support

## Phase 7: Performance

- [x] Task: Optimize performance
    - [x] Add React.memo where needed (TaskCard wrapped in React.memo)
    - [x] Optimize Convex queries
    - [x] Add code splitting
    - [x] Test bundle size

## Phase 8: E2E Testing

- [x] Task: Write E2E tests
    - [x] Create Playwright tests for critical paths (settings.spec.ts exists)
    - [x] Test sprint planning flow
    - [x] Test kanban board interactions
    - [x] Test settings save

## Phase 9: Final Review

- [ ] Task: Final review and cleanup
    - [ ] Review all code for quality
    - [ ] Run full test suite
    - [ ] Check for console errors
    - [ ] Update documentation
