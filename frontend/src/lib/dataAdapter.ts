/**
 * Data source adapter boundary.
 *
 * Each data slice can be independently configured to read from either
 * the Bun API (via /api/* endpoints) or Convex (direct subscription).
 *
 * Set VITE_CONVEX_URL to enable Convex-backed slices.
 * The Bun server on :8081 serves as the API fallback layer.
 */

export type DataSource = 'go' | 'convex'

export type SliceConfig = {
  projects: DataSource
  agents: DataSource
  harnesses: DataSource
  tasks: DataSource
  issues: DataSource
  logs: DataSource
  settings: DataSource
}

function envSource(key: string, fallback: DataSource): DataSource {
  const value = import.meta.env[key] as string | undefined
  if (value === 'convex') return 'convex'
  if (value === 'go') return 'go'
  return fallback
}

export function getSliceConfig(): SliceConfig {
  const hasConvex = Boolean(import.meta.env.VITE_CONVEX_URL)
  const defaultSource: DataSource = hasConvex ? 'convex' : 'go'

  return {
    projects: envSource('VITE_SOURCE_PROJECTS', defaultSource),
    agents: envSource('VITE_SOURCE_AGENTS', defaultSource),
    harnesses: envSource('VITE_SOURCE_HARNESSES', defaultSource),
    tasks: envSource('VITE_SOURCE_TASKS', defaultSource),
    issues: envSource('VITE_SOURCE_ISSUES', defaultSource),
    logs: envSource('VITE_SOURCE_LOGS', defaultSource),
    settings: envSource('VITE_SOURCE_SETTINGS', defaultSource),
  }
}
