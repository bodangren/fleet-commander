/**
 * Data source adapter boundary.
 *
 * Each data slice can be independently configured to read from either
 * the Bun API (via /api/* endpoints) or Convex (direct subscription).
 *
 * Set VITE_CONVEX_URL to enable Convex-backed slices.
 * The Bun server on :8081 serves as the API fallback layer.
 */

export type DataSource = 'bun' | 'convex'

export type SliceConfig = {
  projects: DataSource
  agents: DataSource
  harnesses: DataSource
  tasks: DataSource
  issues: DataSource
  logs: DataSource
  settings: DataSource
}

type EnvMap = Record<string, string | undefined>

/**
 * Data source adapter boundary.
 *
 * Each data slice can be independently configured to read from either
 * the Bun API (via /api/* endpoints) or Convex (direct subscription).
 *
 * Set VITE_CONVEX_URL to enable Convex-backed slices.
 * The Bun server on :8081 serves as the API fallback layer.
 */
function envSource(env: EnvMap, key: string, fallback: DataSource): DataSource {
  const value = env[key]
  if (value === 'convex') return 'convex'
  if (value === 'bun') return 'bun'
  return fallback
}

/**
 * Data source adapter boundary.
 *
 * Each data slice can be independently configured to read from either
 * the Bun API (via /api/* endpoints) or Convex (direct subscription).
 *
 * Set VITE_CONVEX_URL to enable Convex-backed slices.
 * The Bun server on :8081 serves as the API fallback layer.
 */
export function getSliceConfigFromEnv(env: EnvMap): SliceConfig {
  const hasConvex = Boolean(env.VITE_CONVEX_URL)
  const defaultSource: DataSource = hasConvex ? 'convex' : 'bun'

  return {
    projects: envSource(env, 'VITE_SOURCE_PROJECTS', defaultSource),
    agents: envSource(env, 'VITE_SOURCE_AGENTS', defaultSource),
    harnesses: envSource(env, 'VITE_SOURCE_HARNESSES', defaultSource),
    tasks: envSource(env, 'VITE_SOURCE_TASKS', defaultSource),
    issues: envSource(env, 'VITE_SOURCE_ISSUES', defaultSource),
    logs: envSource(env, 'VITE_SOURCE_LOGS', defaultSource),
    settings: envSource(env, 'VITE_SOURCE_SETTINGS', defaultSource),
  }
}

/**
 * Data source adapter boundary.
 *
 * Each data slice can be independently configured to read from either
 * the Bun API (via /api/* endpoints) or Convex (direct subscription).
 *
 * Set VITE_CONVEX_URL to enable Convex-backed slices.
 * The Bun server on :8081 serves as the API fallback layer.
 */
export function getSliceConfig(): SliceConfig {
  return getSliceConfigFromEnv(import.meta.env as EnvMap)
}
