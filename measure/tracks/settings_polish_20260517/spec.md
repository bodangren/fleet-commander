# Specification: Settings & Polish

## Overview

Build the settings page and apply final UI polish with comprehensive testing.

## Reference

- **UI Mockup**: `measure/ui-mockups.html` — Settings view (sidebar → System → Settings)
- **Product Definition**: `measure/product.md` — Dashboard Views
- **Design System**: `DESIGN.md` — Linear design tokens for settings UI

## UI Layout (from mockup)

```
┌─────────────────────────────────────────────────────────────┐
│ Settings                                                     │
├─────────────────────────────────────────────────────────────┤
│ General                                                      │
│ Default Agent: [Alice ▾]    Scheduler Interval: [5 minutes] │
│ Log Retention: [30 days ▾]  Provider Cache TTL: [3600]      │
├─────────────────────────────────────────────────────────────┤
│ Notifications                                                │
│ ☑ Task completed notifications                               │
│ ☑ Budget alerts                                              │
│ ☑ Circuit breaker alerts                                     │
│ ☐ Daily digest                                               │
├─────────────────────────────────────────────────────────────┤
│ [Save Settings]                                              │
└─────────────────────────────────────────────────────────────┘
```

## Requirements

### R1: General Settings

- Default agent selection
- Scheduler interval configuration
- Log retention policy
- Provider cache TTL

### R2: Notification Settings

- Task completed notifications
- Budget alerts
- Circuit breaker alerts
- Daily digest

### R3: UI Polish

- Consistent Linear design tokens across all views
- Loading states for all async operations
- Empty states for no data
- Error states and messages
- Responsive design for all viewports

### R4: Testing

- Unit tests for all components
- Integration tests for key flows
- E2E tests for critical paths
- Accessibility testing

## Acceptance Criteria

- [ ] Settings page saves correctly
- [ ] Notifications work as configured
- [ ] UI is consistent across all views
- [ ] Loading states display correctly
- [ ] Empty states show helpful messages
- [ ] Error states are informative
- [ ] Responsive design works
- [ ] All tests pass
