# Authentication & Authorization

## Overview

API key authentication for external integrations, role-based access control, audit logging of all mutations, and session management. Integrates with Convex Auth or custom JWT.

## Functional Requirements

1. **Authentication**
   - API key authentication: generate/manage keys for external integrations
   - Convex Auth integration: email/password, OAuth providers (GitHub, Google)
   - Custom JWT support: validate tokens issued by external identity providers
   - API keys scoped to specific permissions and optional expiration

2. **Role-Based Access Control**
   - Roles: admin, operator, viewer
   - Admin: full access (manage users, projects, settings)
   - Operator: execute tasks, manage agents, trigger dispatch
   - Viewer: read-only access to dashboards and reports
   - Permission checks on all Convex mutations and queries
   - Role assignment per-user, with optional per-project overrides

3. **Audit Log**
   - Log all mutations: user identity, action, target resource, timestamp, before/after
   - `auditLog` table with indexes for efficient querying by user, resource, time
   - Audit log UI: filterable, searchable, paginated
   - Retention policy: configurable (default 90 days)

4. **Session Management**
   - Configurable session timeout (default 24h, min 1h, max 7d)
   - Refresh token rotation: new refresh token on each use
   - Session revocation: admin can terminate user sessions
   - Concurrent session limit (configurable, default 5)

## Data Sources

- `users` (new) — user accounts, roles, API keys (hashed)
- `sessions` (new) — active sessions, refresh tokens
- `auditLog` (new) — mutation audit trail
- Convex Auth — identity provider integration

## Acceptance Criteria

- [ ] API keys authenticate external requests with correct permissions
- [ ] Convex Auth login works with email/password and OAuth
- [ ] RBAC enforced: viewer cannot mutate, operator cannot manage users
- [ ] All mutations logged to auditLog with user identity
- [ ] Sessions expire after configured timeout
- [ ] Admin can view and revoke active sessions
- [ ] Audit log queryable by user, action type, and time range

## Out of Scope

- Single Sign-On (SAML/LDAP)
- Multi-factor authentication
- IP allowlisting
- SOC 2 compliance automation
