# Runbook: Quality Workflow Rollback

## Purpose

This runbook describes how to disable a project's quality workflow profile without reverting schema or losing historical `qualityRuns` rows. The procedure does not require code changes.

## When to use

- A project's quality profile is causing unexpected blocks (e.g., kill switch pausing work due to invalid configuration).
- You want to temporarily revert to no-profile behavior while investigating a quality-workflow issue.
- You want to switch from `strict` to `standard` or `none` for a specific project.

## Procedure

### 1. Disable quality workflow for a project

Set the project's quality profile to `none` via the Convex mutation:

```typescript
// Via Convex dashboard or a one-shot script:
await client.mutation(api.qualityProfiles.selectProjectProfile, {
  projectSlug: '<project-slug>',
  profileName: 'none',
  profileVersion: 0,
});
```

Or via the Fleet Commander UI:
1. Navigate to **Settings > Quality Workflow**.
2. Select profile **none** from the dropdown.
3. Click **Save**.

**Effect:** The orchestrator will skip all quality stages for this project. Existing executor/reviewer/merger behavior is unchanged. No quality runs will be started for new tasks.

### 2. Verify the change took effect

Check the effective profile for the project:

```typescript
const effective = await client.query(api.qualityProfiles.getEffectiveProjectProfile, {
  projectSlug: '<project-slug>',
});
// Expected: { profileName: 'none', profileVersion: 0, kind: 'none', stages: [] }
```

### 3. Historical data is preserved

Disabling a project's profile does NOT delete:
- `qualityProfiles` rows (profile definitions are global, not per-project).
- `qualityRuns` rows (historical quality run records are retained).
- `qualityStageAttempts` rows (historical stage attempt records are retained).
- `projectProfileSelections` rows (the previous selection is updated, not deleted).
- `runProfileSnapshots` rows (claimed runs retain their immutable snapshot).

### 4. Re-enable quality workflow

To re-enable, select a profile again:

```typescript
await client.mutation(api.qualityProfiles.selectProjectProfile, {
  projectSlug: '<project-slug>',
  profileName: 'strict', // or 'standard'
  profileVersion: 1, // use the latest published version
});
```

New tasks will execute quality stages according to the selected profile.

## Rollback without code changes

This entire procedure uses existing Convex mutations and queries. No code deployment, schema migration, or infrastructure change is required.

## Escalation

If the kill switch is pausing all projects due to an invalid profile configuration:
1. Identify the invalid profile via `listProfiles` query.
2. Fix the profile configuration (remove unsafe stage commands, fix stage ordering).
3. Publish a new profile version.
4. Update affected project selections to the new version.

If the issue persists, set all affected projects to `none` and escalate to the track maintainer.
