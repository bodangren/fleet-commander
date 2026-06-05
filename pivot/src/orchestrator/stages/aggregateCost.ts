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
export function aggregateCost(
  markers: TimingMarkers,
  now: number = Date.now(),
): PipelineTimings {
  const result: PipelineTimings = {};

  if (markers.loadStartMs !== undefined && markers.loadEndMs !== undefined) {
    result.loadMs = markers.loadEndMs - markers.loadStartMs;
  }

  if (markers.scoreStartMs !== undefined && markers.scoreEndMs !== undefined) {
    result.scoreMs = markers.scoreEndMs - markers.scoreStartMs;
  }

  if (markers.executeStartMs !== undefined && markers.executeEndMs !== undefined) {
    result.executeMs = markers.executeEndMs - markers.executeStartMs;
  }

  if (markers.persistStartMs !== undefined && markers.persistEndMs !== undefined) {
    result.persistMs = markers.persistEndMs - markers.persistStartMs;
  }

  if (markers.hookBeforeStartMs !== undefined && markers.hookBeforeEndMs !== undefined) {
    result.hookBeforeMs = markers.hookBeforeEndMs - markers.hookBeforeStartMs;
  }

  if (markers.hookAfterStartMs !== undefined && markers.hookAfterEndMs !== undefined) {
    result.hookAfterMs = markers.hookAfterEndMs - markers.hookAfterStartMs;
  }

  result.totalMs = now - markers.pipelineStartMs;

  return result;
}
