import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { BUILTIN_PROFILES, BUILTIN_NONE_PROFILE, type QualityProfileType } from '../shared/qualityProfile';
import type { QualityWorkflowHooks, Task } from './types';
import {
  runQualityWorkflow,
  type CloseoutEligibilityContext,
  type QualityStageSpec,
  type StageContext,
} from './qualityWorkflowRunner';

const qualityProfilesApi = (api as any).qualityProfiles as {
  getEffectiveTaskProfile: unknown;
  recordClaimedRunProfile: unknown;
};

export interface ConfiguredQualityResult {
  status: 'passed' | 'failed';
  summary: string;
  error: string;
}

/**
 * Runs the configured nested quality workflow for executor dispatches.
 *
 * @param client - Convex client used by the parent orchestrator
 * @param projectSlug - Project being dispatched
 * @param task - Claimed task
 * @param runId - Parent work-run id
 * @param rootPath - Project root path
 * @param trackContext - Optional track context passed to execution
 * @param hooks - Optional dependency-injected quality workflow hooks
 */
export async function runConfiguredQualityWorkflow(
  client: ConvexHttpClient,
  projectSlug: string,
  task: Task,
  runId: string,
  rootPath: string,
  trackContext: unknown,
  hooks?: QualityWorkflowHooks,
): Promise<ConfiguredQualityResult | null> {
  const profile = hooks?.getEffectiveProfile
    ? await hooks.getEffectiveProfile(client, projectSlug, task.taskKey)
    : await loadEffectiveQualityProfile(client, projectSlug, task.taskKey);

  if (profile.kind === 'none' || profile.stages.length === 0) {
    return null;
  }

  if (hooks?.recordProfileSnapshot) {
    await hooks.recordProfileSnapshot(client, projectSlug, task.taskKey, runId);
  } else {
    await recordQualityProfileSnapshot(client, projectSlug, task.taskKey, runId);
  }

  if (hooks?.onQualityRunStart) {
    await hooks.onQualityRunStart(client, {
      projectSlug,
      taskKey: task.taskKey,
      runId,
      profile: {
        profileName: profile.name,
        profileVersion: profile.version,
        stages: profile.stages,
      },
    });
  }

  const context = hooks?.getStageContext?.({ task, rootPath, trackContext }) ?? defaultStageContext(task, rootPath);
  const closeoutContext = hooks?.getCloseoutContext?.({ task, rootPath, trackContext }) ?? defaultCloseoutContext(context);
  const runner = hooks?.runner;
  if (!runner) {
    return {
      status: 'failed',
      summary: `Quality workflow failed for ${task.taskKey}: no runner provided`,
      error: 'QualityWorkflowHooks.runner is required but was not provided — refusing to auto-pass stages',
    };
  }

  const stageSpecs: QualityStageSpec[] = profile.stages.map((stage) => ({
    kind: stage.kind,
    required: stage.policy.required,
    applicability: stage.policy.applicability,
    role: stage.policy.role,
    attempts: stage.policy.attempts,
    timeoutMs: stage.policy.timeoutMs,
    rootPath,
  }));

  const result = await runQualityWorkflow(
    stageSpecs,
    context,
    runner,
    closeoutContext,
    {
      projectSlug,
      taskKey: task.taskKey,
      runId,
      rootPath,
    },
  );

  if (hooks?.onStageResult) {
    for (const entry of result.stageLog) {
      if (entry.status === 'skipped') continue;
      const spec = stageSpecs.find((s) => s.kind === entry.stageKind);
      // FR-1: forward the real per-stage execution window captured by the
      // runner (entry.startedAt / entry.finishedAt). Fall back to
      // dispatch-time `Date.now()` when the runner does not supply timing
      // — preserves backward compatibility with runners that don't yet
      // implement the timing fields.
      const dispatchNow = Date.now();
      const startedAt = entry.startedAt ?? dispatchNow;
      const finishedAt = entry.finishedAt ?? dispatchNow;
      await hooks.onStageResult(client, {
        projectSlug,
        taskKey: task.taskKey,
        runId,
        stageKind: entry.stageKind,
        role: spec?.role ?? 'executor',
        attempt: entry.attempt,
        status: entry.status,
        startedAt,
        finishedAt,
        evidence: entry.feedback?.gateEvidence,
      });
    }
  }

  if (result.outcome === 'failed') {
    if (hooks?.onQualityRunFinish) {
      await hooks.onQualityRunFinish(client, {
        projectSlug,
        taskKey: task.taskKey,
        runId,
        status: 'failed',
        reason: result.reason,
        finishedAt: Date.now(),
      });
    }
    return {
      status: 'failed',
      summary: `Quality workflow failed for ${task.taskKey}: ${result.reason ?? 'unknown failure'}`,
      error: result.reason ?? `Quality workflow failed at ${result.failedStageKind ?? 'unknown stage'}`,
    };
  }

  if (hooks?.onQualityRunFinish) {
    await hooks.onQualityRunFinish(client, {
      projectSlug,
      taskKey: task.taskKey,
      runId,
      status: 'passed',
      finishedAt: Date.now(),
    });
  }

  return {
    status: 'passed',
    summary: `Quality workflow passed for ${task.taskKey}: ${result.stageLog.length} stage(s) completed`,
    error: '',
  };
}

async function loadEffectiveQualityProfile(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
): Promise<QualityProfileType> {
  const effective = await client.query(qualityProfilesApi.getEffectiveTaskProfile as any, {
    projectSlug,
    taskKey,
  });
  const profileName = effective?.profileName ?? effective?.name ?? 'none';
  const builtin = BUILTIN_PROFILES[profileName];
  if (!builtin) {
    // Non-built-in profile: fall back to none rather than crashing
    return BUILTIN_NONE_PROFILE;
  }
  return builtin;
}

async function recordQualityProfileSnapshot(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
  runId: string,
): Promise<void> {
  await client.mutation(qualityProfilesApi.recordClaimedRunProfile as any, {
    projectSlug,
    taskKey,
    runId,
    now: Date.now(),
  });
}

function defaultStageContext(task: Task, rootPath: string): StageContext {
  const changedHint = [task.title, task.spec, rootPath].filter(Boolean).join(' ');
  return {
    trackIsSetup: /setup|track setup/i.test(task.title),
    hasFrontendChanges: /frontend|ui|ux|tsx|react|vite/i.test(changedHint),
    isFinalAcceptance: /final acceptance|acceptance/i.test(task.title),
    isFinalCloseout: /closeout|archive/i.test(task.title),
  };
}

function defaultCloseoutContext(context: StageContext): CloseoutEligibilityContext {
  return {
    isFinalCloseout: context.isFinalCloseout,
    verifyPassed: false,
    orphansPassed: false,
  };
}
