/**
 * Convex mutation/query handlers for quality workflow runs and stage attempts.
 *
 * Persists parent quality-run records with immutable profile snapshots,
 * appends stage-attempt records (append-only), manages terminal transitions,
 * and supports resume-from-first-incomplete-required-stage.
 *
 * @module qualityRuns
 */

const TERMINAL_STATUSES = new Set(['passed', 'failed', 'blocked', 'cancelled']);

function assertNonEmpty(value: string, label: string) {
  if (!value || value.trim() === '') {
    throw new Error(`${label} is required`);
  }
}

/**
 * Starts (or idempotently replays) a parent quality run.
 *
 * Idempotency key: (idempotencyKey, projectSlug, taskKey). Replaying
 * with the same triple returns the existing row without inserting a duplicate.
 */
export async function startQualityRunHandler(
  ctx: any,
  args: {
    projectSlug: string;
    taskKey: string;
    runId: string;
    idempotencyKey: string;
    profileName: string;
    profileVersion: number;
    now: number;
  },
) {
  assertNonEmpty(args.idempotencyKey, 'idempotencyKey');

  // Check for existing run with the same idempotency triple
  const existing = await ctx.db
    .query('qualityRuns')
    .withIndex('by_idempotency', (q: any) =>
      q
        .eq('idempotencyKey', args.idempotencyKey)
        .eq('projectSlug', args.projectSlug)
        .eq('taskKey', args.taskKey),
    )
    .collect();

  if (existing.length > 0) {
    return existing[0];
  }

  const doc = {
    projectSlug: args.projectSlug,
    taskKey: args.taskKey,
    runId: args.runId,
    idempotencyKey: args.idempotencyKey,
    profileName: args.profileName,
    profileVersion: args.profileVersion,
    status: 'running' as const,
    createdAt: args.now,
    finishedAt: undefined as number | undefined,
    reason: undefined as string | undefined,
  };

  await ctx.db.insert('qualityRuns', doc);
  return doc;
}

/**
 * Appends a stage-attempt record to a quality run.
 *
 * Rejects if the parent run does not exist or is already in a terminal state.
 */
export async function appendStageAttemptHandler(
  ctx: any,
  args: {
    projectSlug: string;
    runId: string;
    stageKind: string;
    role: string;
    attempt: number;
    status: string;
    startedAt: number;
    finishedAt: number;
    evidence?: Record<string, unknown>;
    costUSD?: number;
    tokens?: number;
    model?: string;
    now: number;
  },
) {
  // Verify parent run exists and is not terminal
  const runs = await ctx.db
    .query('qualityRuns')
    .withIndex('by_runId', (q: any) => q.eq('runId', args.runId))
    .collect();

  if (runs.length === 0) {
    throw new Error(`Quality run not found: ${args.runId}`);
  }

  const run = runs[0];
  if (TERMINAL_STATUSES.has(run.status)) {
    throw new Error(`Cannot append to a terminal quality run (${run.status})`);
  }

  const doc = {
    projectSlug: args.projectSlug,
    runId: args.runId,
    stageKind: args.stageKind,
    role: args.role,
    attempt: args.attempt,
    status: args.status,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    evidence: args.evidence ?? null,
    costUSD: args.costUSD ?? 0,
    tokens: args.tokens ?? 0,
    model: args.model ?? null,
    createdAt: args.now,
  };

  await ctx.db.insert('qualityStageAttempts', doc);
  return doc;
}

/**
 * Transitions a quality run to a terminal status (passed / failed / blocked / cancelled).
 *
 * Terminal transitions are one-way: rejects if the run is already terminal.
 * Rejects unknown terminal statuses.
 */
export async function finishQualityRunHandler(
  ctx: any,
  args: {
    projectSlug: string;
    runId: string;
    status: 'passed' | 'failed' | 'blocked' | 'cancelled';
    reason?: string;
    now: number;
  },
) {
  if (!TERMINAL_STATUSES.has(args.status)) {
    throw new Error(`Unknown terminal status: ${args.status}`);
  }

  const runs = await ctx.db
    .query('qualityRuns')
    .withIndex('by_runId', (q: any) => q.eq('runId', args.runId))
    .collect();

  if (runs.length === 0) {
    throw new Error(`Quality run not found: ${args.runId}`);
  }

  const run = runs[0];
  if (TERMINAL_STATUSES.has(run.status)) {
    throw new Error(`Quality run is already terminal (${run.status})`);
  }

  const patch: Record<string, unknown> = {
    status: args.status,
    finishedAt: args.now,
  };
  if (args.reason !== undefined) {
    patch.reason = args.reason;
  }

  await ctx.db.patch(run._id, patch);

  return { ...run, ...patch };
}

/**
 * Records a skipped stage with a reason. The attempt number is 0
 * (no execution attempt was made).
 *
 * Rejects an empty reason (audit boundary).
 */
export async function markStageSkippedHandler(
  ctx: any,
  args: {
    projectSlug: string;
    runId: string;
    stageKind: string;
    reason: string;
    now: number;
  },
) {
  assertNonEmpty(args.reason, 'skip reason');

  // Verify parent run exists
  const runs = await ctx.db
    .query('qualityRuns')
    .withIndex('by_runId', (q: any) => q.eq('runId', args.runId))
    .collect();

  if (runs.length === 0) {
    throw new Error(`Quality run not found: ${args.runId}`);
  }

  const doc = {
    projectSlug: args.projectSlug,
    runId: args.runId,
    stageKind: args.stageKind,
    role: 'n/a',
    attempt: 0,
    status: 'skipped',
    startedAt: args.now,
    finishedAt: args.now,
    evidence: null,
    costUSD: 0,
    tokens: 0,
    model: null,
    reason: args.reason,
    createdAt: args.now,
  };

  await ctx.db.insert('qualityStageAttempts', doc);
  return doc;
}

/**
 * Retries a stage by appending a new attempt with an incremented attempt number.
 *
 * History is append-only: the prior attempt record is retained.
 * Rejects if no prior attempt exists for the given stage + role.
 */
export async function retryStageAttemptHandler(
  ctx: any,
  args: {
    projectSlug: string;
    runId: string;
    stageKind: string;
    role: string;
    startedAt: number;
    now: number;
  },
) {
  // Verify parent run exists
  const runs = await ctx.db
    .query('qualityRuns')
    .withIndex('by_runId', (q: any) => q.eq('runId', args.runId))
    .collect();

  if (runs.length === 0) {
    throw new Error(`Quality run not found: ${args.runId}`);
  }

  // Find prior attempts for this stage + role
  const priorAttempts = await ctx.db
    .query('qualityStageAttempts')
    .withIndex('by_run_stage', (q: any) =>
      q
        .eq('runId', args.runId)
        .eq('stageKind', args.stageKind),
    )
    .collect();

  const roleAttempts = priorAttempts.filter((a: any) => a.role === args.role);
  if (roleAttempts.length === 0) {
    throw new Error(
      `No prior attempt found for stage "${args.stageKind}" role "${args.role}"`,
    );
  }

  const maxAttempt = Math.max(...roleAttempts.map((a: any) => a.attempt));
  const nextAttempt = maxAttempt + 1;

  const doc = {
    projectSlug: args.projectSlug,
    runId: args.runId,
    stageKind: args.stageKind,
    role: args.role,
    attempt: nextAttempt,
    status: 'running',
    startedAt: args.startedAt,
    finishedAt: args.startedAt,
    evidence: null,
    costUSD: 0,
    tokens: 0,
    model: null,
    createdAt: args.now,
  };

  await ctx.db.insert('qualityStageAttempts', doc);
  return doc;
}

/**
 * Returns the in-progress quality run with the list of already-passed
 * required stage kinds so dispatch can skip them on resume.
 *
 * Returns null if the run is terminal (not resumable) or does not exist.
 */
export async function getResumableQualityRunHandler(
  ctx: any,
  args: {
    projectSlug: string;
    runId: string;
  },
) {
  const runs = await ctx.db
    .query('qualityRuns')
    .withIndex('by_runId', (q: any) => q.eq('runId', args.runId))
    .collect();

  if (runs.length === 0) return null;

  const run = runs[0];
  if (TERMINAL_STATUSES.has(run.status)) return null;

  // Collect passed required stage kinds
  const attempts = await ctx.db
    .query('qualityStageAttempts')
    .withIndex('by_run', (q: any) => q.eq('runId', args.runId))
    .collect();

  const passedRequiredStageKinds = [
    ...new Set(
      attempts
        .filter((a: any) => a.status === 'passed' && a.attempt > 0)
        .map((a: any) => a.stageKind),
    ),
  ];

  return {
    ...run,
    passedRequiredStageKinds,
  };
}

/**
 * Lists all stage attempts for a quality run, ordered by creation time.
 */
export async function listStageAttemptsHandler(
  ctx: any,
  args: {
    projectSlug: string;
    runId: string;
  },
) {
  const attempts = await ctx.db
    .query('qualityStageAttempts')
    .withIndex('by_run', (q: any) => q.eq('runId', args.runId))
    .collect();

  return attempts.sort((a: any, b: any) => a.createdAt - b.createdAt);
}
