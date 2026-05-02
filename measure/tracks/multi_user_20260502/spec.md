# Multi-User Support

## Overview

Enable multiple users to share a single Fleet Commander instance with identity awareness, real-time presence, conflict resolution for simultaneous edits, and role-based access control.

## Functional Requirements

1. **User Identity (Convex Auth)**
   - Integrate Convex Auth for user authentication
   - New `users` table: `{ authId, name, email, role, createdAt, lastSeenAt }`
   - Associate mutations with user identity (who created/modified what)
   - User profile page with basic settings

2. **Presence Tracking**
   - Track online users (heartbeat-based, 30s interval)
   - Track current view per user (which page/track/task they're viewing)
   - Presence indicators on dashboard (online user avatars)
   - "User is viewing this" indicator on shared resources

3. **Conflict Resolution**
   - Optimistic locking on `tracks` and `tasks` tables (`version` field)
   - Mutation checks version before write; rejects stale updates
   - Conflict error UI: "This item was modified by {user}. Refresh to see changes."
   - Last-writer-wins with user notification (no merge UI)

4. **Role-Based Access Control**
   - Roles: `admin`, `operator`, `viewer`
   - Admin: full access (manage users, settings, all mutations)
   - Operator: execute tasks, manage tracks, run pipelines
   - Viewer: read-only access to dashboard and data
   - Role assignment via admin UI
   - Permission checks on all mutations

## Data Sources

- New `users` table
- `auth` — Convex auth identity
- `tracks`, `tasks` — add `version`, `lastModifiedBy` fields
- Presence state (ephemeral or in a presence table)

## Acceptance Criteria

- [ ] Users can log in via Convex Auth
- [ ] Online presence shows correct user count and names
- [ ] Concurrent edits to same task surface conflict error to second editor
- [ ] Viewer role cannot execute mutations (API returns 403)
- [ ] Admin can assign/revoke roles
- [ ] All existing mutations work correctly with user attribution

## Out of Scope

- SSO / SAML integration
- Fine-grained permissions (field-level access control)
- Audit log of all user actions (separate track)
- Multi-organization / tenant isolation
