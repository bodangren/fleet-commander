import {
  runProject as runProjectProduction,
  type RunPreflight,
} from './orchestrator'

const passTestPreflight: RunPreflight = async () => ({ ok: true })

/**
 * Runs the production orchestrator with an explicit no-op readiness boundary.
 * This helper is for downstream unit tests that do not exercise Pi readiness.
 * @param args - The production run arguments; an explicit preflight is preserved.
 * @returns The production orchestrator result.
 */
export function runProjectWithTestPreflight(
  ...args: Parameters<typeof runProjectProduction>
): ReturnType<typeof runProjectProduction> {
  const invocation = [...args] as Parameters<typeof runProjectProduction>
  invocation[8] ??= passTestPreflight
  return runProjectProduction(...invocation)
}
