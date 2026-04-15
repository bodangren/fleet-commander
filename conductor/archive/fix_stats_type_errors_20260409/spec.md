# Specification - Fix stats.ts Type Errors

## Problem

Frontend build fails with TypeScript errors in `convex/stats.ts`:

1. **Line 60**: `log.status === 'completed'` - `runStatus` type is `'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'`, no `'completed'` value
2. **Line 87**: `i.status === 'blocked'` - `issueStatus` type is `'open' | 'triaged' | 'resolved' | 'closed'`, no `'blocked'` value

## Solution

1. Change `'completed'` to `'succeeded'` in `getAgentStats` (line 60)
2. Remove the `blocked` field from `getIssueStats` return type and replace with `triaged` count (semantically closest to blocked issues awaiting triage)

## Files Affected

- `convex/stats.ts`

## Verification

- `npm run build` in frontend/ completes without TypeScript errors
- `npm test` in frontend/ passes
