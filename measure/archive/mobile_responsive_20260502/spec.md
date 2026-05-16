# Mobile Responsive

## Overview

Responsive layout and touch-optimized interactions for tablet and phone access to Fleet Commander. Collapsible sidebar, swipe-based kanban navigation, and mobile-optimized data loading.

## Functional Requirements

1. **Responsive Breakpoints**
   - Desktop: ≥1280px — full layout with persistent sidebar
   - Tablet: 768px–1279px — collapsible sidebar, stacked columns
   - Phone: <768px — single-column view, bottom navigation bar
   - CSS Grid/Flexbox based layout with fluid transitions

2. **Touch Interactions**
   - Swipe left/right to navigate between kanban columns
   - Long-press (500ms) for context menu (task actions)
   - Pull-to-refresh on task lists
   - Touch-friendly hit targets (min 44×44px per WCAG)
   - Pinch-to-zoom on detail panels

3. **Collapsible Sidebar**
   - Toggle button or swipe gesture to collapse sidebar
   - Collapsed state: icon-only navigation rail
   - Expand on hover (desktop) or tap (mobile)
   - Persist sidebar state in user preferences

4. **Mobile-Optimized Data Loading**
   - Reduce initial page size on mobile (20 items vs. 100)
   - Lazy load columns as user scrolls/swipes
   - Skeleton loading states for slow connections
   - Offline indicator when Convex connection lost

## Data Sources

- Existing frontend components (kanban, sidebar, detail panels)
- `userPreferences` — sidebar state

## Acceptance Criteria

- [ ] Layout adapts correctly at all three breakpoints
- [ ] Swipe navigation works on kanban board (iOS Safari, Chrome Android)
- [ ] Long-press context menu appears with correct task actions
- [ ] Sidebar collapses/expands with smooth animation
- [ ] Initial page load <3s on 3G connection (mobile)
- [ ] All interactive elements have ≥44px touch targets
- [ ] Pull-to-refresh reloads task data

## Out of Scope

- Native mobile app (React Native / Expo)
- Offline-first with local database sync
- Push notifications for mobile
- Mobile-specific features (camera, GPS)
