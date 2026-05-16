# Mobile Responsive — Implementation Plan

## Phase 1: Responsive Breakpoints

- [ ] Audit current layout for fixed-width elements and hardcoded pixel values
- [ ] Define CSS custom properties for breakpoints: desktop (1280px), tablet (768px), phone (<768px)
- [ ] Refactor kanban board to CSS Grid with responsive column widths
- [ ] Implement collapsible sidebar with toggle button
- [ ] Build bottom navigation bar for phone layout
- [ ] Add fluid typography scaling (clamp-based font sizes)
- [ ] Test layout on Chrome DevTools device emulation (iPad, iPhone, Pixel)
- [ ] Write visual regression tests for each breakpoint

## Phase 2: Touch Interactions

- [ ] Implement swipe gesture detection (touchstart/touchmove/touchend) for kanban columns
- [ ] Swipe threshold: >50px horizontal, <30px vertical to register as swipe
- [ ] Column transition animation on swipe (CSS transform)
- [ ] Long-press detection (500ms hold) triggering context menu overlay
- [ ] Context menu positioned near touch point with task actions
- [ ] Pull-to-refresh: detect overscroll at top, trigger data reload
- [ ] Ensure all buttons/links have ≥44×44px touch target (add padding if needed)
- [ ] Write touch interaction tests with simulated touch events

## Phase 3: Mobile-Optimized Data Loading

- [ ] Add responsive query limit: detect viewport width, reduce page size on mobile
- [ ] Implement virtual scrolling or pagination for task lists on mobile
- [ ] Lazy load kanban columns: fetch data only for visible + adjacent columns
- [ ] Build skeleton loading components matching task card layout
- [ ] Add network status detection (navigator.onLine) and offline indicator
- [ ] Cache last-known data in memory for offline viewing
- [ ] Performance audit: measure LCP, FID, CLS on simulated 3G
- [ ] End-to-end tests: load on mobile viewport, verify reduced data fetch
