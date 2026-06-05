/**
 * Pure cost/timing aggregation for a pipeline run.
 *
 * The orchestrator records timestamps at each stage boundary. This module
 * computes the derived duration fields from those timestamps so that
 * `persistWorkRun` receives a single, pre-computed timings object.
 */

/**
 * Fields captured per pipeline stage for telemetry.
 * Kept in sync with the `TimingFields` in `persistRun.ts`.
 */
export interface PipelineTimings {
  loadMs?: number;
  scoreMs?: number;
  executeMs?: number;
  persistMs?: number;
  hookBeforeMs?: number;
  hookAfterMs?: number;
  totalMs?: number;
}

/**
 * Raw timestamp markers recorded by the orchestrator at stage boundaries.
 * All values are epoch milliseconds (from `Date.now()`).
 */
export interface TimingMarkers {
  pipelineStartMs: number;
  loadStartMs?: number;
  loadEndMs?: number;
  scoreStartMs?: number;
  scoreEndMs?: number;
  executeStartMs?: number;
  executeEndMs?: number;
  persistStartMs?: number;
  persistEndMs?: number;
  hookBeforeStartMs?: number;
  hookBeforeEndMs?: number;
  hookAfterStartMs?: number;
  hookAfterEndMs?: number;
}

/**
 * Computes derived timing durations from raw stage-boundary timestamps.
 *
 * This is a pure function: given a set of markers and a `now` value it
 * returns the same-shaped object every time. When a start/end pair is
 * missing the corresponding field is `undefined`.
 *
 * @param markers - Raw epoch-ms timestamps recorded at stage boundaries
 * @param now - The current epoch-ms timestamp (injectable for testing)
 * @returns Computed duration fields suitable for `persistWorkRun`
 */
export interface AggregateCostResult extends PipelineTimings {
  /** The stage that started but never ended, if any. */
  failedStage?: string;
  /** Map of stage-role name to its computed duration in ms. */
  roleCosts?: Record<string, number>;
  /** Number of retry attempts detected (currently always 0). */
  retryCount?: number;
}

interface StageMapping {
  startKey: keyof TimingMarkers;
  endKey: keyof TimingMarkers;
  role: string;
  resultKey: keyof PipelineTimings;
}

const STAGE_MAPPINGS: StageMapping[] = [
  { startKey: 'loadStartMs', endKey: 'loadEndMs', role: 'load', resultKey: 'loadMs' },
  { startKey: 'scoreStartMs', endKey: 'scoreEndMs', role: 'score', resultKey: 'scoreMs' },
  { startKey: 'executeStartMs', endKey: 'executeEndMs', role: 'execute', resultKey: 'executeMs' },
  { startKey: 'persistStartMs', endKey: 'persistEndMs', role: 'persist', resultKey: 'persistMs' },
  { startKey: 'hookBeforeStartMs', endKey: 'hookBeforeEndMs', role: 'hookBefore', resultKey: 'hookBeforeMs' },
  { startKey: 'hookAfterStartMs', endKey: 'hookAfterEndMs', role: 'hookAfter', resultKey: 'hookAfterMs' },
];

/**
 * Computes derived timing durations from raw stage-boundary timestamps.
 *
 * This is a pure function: given a set of markers and a `now` value it
 * returns the same-shaped object every time. When a start/end pair is
 * missing the corresponding field is `undefined`.
 *
 * @param markers - Raw epoch-ms timestamps recorded at stage boundaries
 * @param now - The current epoch-ms timestamp (injectable for testing)
 * @returns Computed duration fields suitable for `persistWorkRun`
 */
export function aggregateCost(
  markers: TimingMarkers,
  now: number = Date.now(),
): AggregateCostResult {
  const result: AggregateCostResult = {};
  const roleCosts: Record<string, number> = {};

  for (const mapping of STAGE_MAPPINGS) {
    const start = markers[mapping.startKey];
    const end = markers[mapping.endKey];

    if (start !== undefined && end !== undefined) {
      (result as Record<string, unknown>)[mapping.resultKey] = end - start;
      roleCosts[mapping.role] = end - start;
    } else if (start !== undefined && end === undefined) {
      // Stage started but never ended — report as failed stage.
      // Only record the first such stage (by pipeline order).
      if (result.failedStage === undefined) {
        result.failedStage = mapping.role;
      }
    }
  }

  if (Object.keys(roleCosts).length > 0) {
    result.roleCosts = roleCosts;
  }

  result.retryCount = 0;
  result.totalMs = now - markers.pipelineStartMs;

  return result;
}
