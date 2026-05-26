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

- [ ] Task: Apply UI polish
    - [ ] Review all components for consistency
    - [ ] Add loading skeletons
    - [ ] Add empty state illustrations
    - [ ] Add error boundaries
    - [ ] Test responsive design

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

- [ ] Task: Add accessibility features
    - [ ] Add ARIA labels
    - [ ] Test keyboard navigation
    - [ ] Check color contrast
    - [ ] Add screen reader support

## Phase 7: Performance

- [ ] Task: Optimize performance
    - [ ] Add React.memo where needed
    - [ ] Optimize Convex queries
    - [ ] Add code splitting
    - [ ] Test bundle size

## Phase 8: E2E Testing

- [ ] Task: Write E2E tests
    - [ ] Create Playwright tests for critical paths
    - [ ] Test sprint planning flow
    - [ ] Test kanban board interactions
    - [ ] Test settings save

## Phase 9: Final Review

- [ ] Task: Final review and cleanup
    - [ ] Review all code for quality
    - [ ] Run full test suite
    - [ ] Check for console errors
    - [ ] Update documentation
