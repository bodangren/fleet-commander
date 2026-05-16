# Multi-User — Implementation Plan

> **Symphony Compliance:** Disambiguate auth identity from Symphony opencode session ownership. RBAC must restrict hook configuration.

## Phase 1: User Identity

- [ ] Configure Convex Auth provider
- [ ] Define `users` table schema in Convex
- [ ] Create user profile mutation (sync auth identity to users table on first login)
- [ ] Add `userId` / `lastModifiedBy` fields to tracks and tasks tables
- [ ] Implement auth guards on all existing mutations (require authenticated user)
- [ ] Build `UserProfile` page component
- [ ] Write tests for auth integration and user creation

## Phase 2: Presence

- [ ] Define presence data model (heartbeat, currentView)
- [ ] Implement `updatePresence` mutation (called every 30s by client)
- [ ] Create `getOnlineUsers` query (users with heartbeat within 60s)
- [ ] Build `PresenceBar` component (online user avatars in header)
- [ ] Build `ViewingIndicator` component ("X is viewing this" on shared resources)
- [ ] Add `currentView` tracking to page navigation
- [ ] Write tests for presence lifecycle (join, heartbeat, timeout)

## Phase 3: RBAC

- [ ] Add `role` field to users table (admin/operator/viewer)
- [ ] Create role-based permission check middleware for mutations
- [ ] Implement permission matrix: which roles can access which mutations
- [ ] Add `hookConfiguration` permission: restrict `beforeRunHook`/`afterRunHook`/`afterCreateHook` changes to admin/operator
- [ ] Add `sessionManagement` permission: only admin can force-abandon Symphony opencode sessions
- [ ] Build `UserManagement` admin page (list users, assign roles)
- [ ] Add optimistic locking: `version` field on tracks and tasks
- [ ] Implement conflict detection in update mutations
- [ ] Build `ConflictError` UI component
- [ ] Write tests for permission enforcement across all roles (including hook/session permissions)
- [ ] Write tests for optimistic locking conflict scenarios
