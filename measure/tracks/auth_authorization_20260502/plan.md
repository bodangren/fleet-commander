# Authentication & Authorization — Implementation Plan

## Phase 1: Authentication

- [ ] Define `users` table: id, email, passwordHash, role, apiKeys (hashed), createdAt
- [ ] Define `sessions` table: userId, refreshToken (hashed), expiresAt, createdAt
- [ ] Integrate Convex Auth: configure providers (email/password, GitHub OAuth)
- [ ] Implement API key generation: random key, hash before store, return plaintext once
- [ ] API key validation middleware in pivot routes
- [ ] JWT validation support: configurable JWKS endpoint for external providers
- [ ] Login/signup UI in frontend
- [ ] Write unit tests for auth flows: login, signup, API key creation, JWT validation

## Phase 2: RBAC

- [ ] Define role permissions matrix: admin, operator, viewer → allowed actions
- [ ] Implement `checkPermission` helper: user role + required permission → allow/deny
- [ ] Add permission checks to all Convex mutations (reject unauthorized)
- [ ] Add permission checks to all Convex queries (filter by access level)
- [ ] Per-project role overrides: optional project-level role assignment
- [ ] Role management UI: admin can assign/change user roles
- [ ] Write tests for each role: verify allowed and denied operations

## Phase 3: Audit Log

- [ ] Define `auditLog` table: userId, action, resourceType, resourceId, before, after, timestamp
- [ ] Add Convex indexes: by userId, by resourceType+resourceId, by timestamp
- [ ] Implement mutation interceptor: wrap mutations to auto-log to auditLog
- [ ] Audit log UI: table with filters (user, action, date range), search, pagination
- [ ] Session management: implement timeout, refresh token rotation, revocation
- [ ] Admin session management UI: list active sessions, revoke button
- [ ] Retention policy: Convex cron to purge auditLog entries older than configured days
- [ ] End-to-end tests: perform mutations, verify audit log entries, test session expiry
