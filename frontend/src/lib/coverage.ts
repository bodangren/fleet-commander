import yaml from 'js-yaml'

export interface CoverageResult {
  percentage: number
  tool: string
  raw?: unknown
}

export interface VitestCoverageData {
  total?: {
    lines?: { pct: number; covered: number; uncovered: number; skipped?: number }
    statements?: { pct: number; covered: number; uncovered: number; skipped?: number }
    functions?: { pct: number; covered: number; uncovered: number; skipped?: number }
    branches?: { pct: number; covered: number; uncovered: number; skipped?: number }
  }
  [key: string]: unknown
}

export function parseVitestCoverage(data: unknown): CoverageResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid coverage data')
  }

  const coverageData = data as VitestCoverageData

  if (!coverageData.total) {
    throw new Error('Missing total in coverage data')
  }

  if (!coverageData.total.lines) {
    throw new Error('Missing total.lines in coverage data')
  }

  if (typeof coverageData.total.lines.pct !== 'number') {
    throw new Error('Missing total.lines.pct in coverage data')
  }

  return {
    percentage: coverageData.total.lines.pct,
    tool: 'vitest',
    raw: data,
  }
}

export function parseCoverage(tool: string, data: unknown): CoverageResult {
  const normalizedTool = tool.toLowerCase()
  switch (normalizedTool) {
    case 'vitest':
    case 'jest': {
      const result = parseVitestCoverage(data)
      return { ...result, tool: normalizedTool }
    }
    default:
      throw new Error(`Unsupported coverage tool: ${tool}`)
  }
}

export interface CoverageThresholds {
  feature: number
  bug: number
  chore: number
  default: number
}

export const defaultCoverageThresholds: CoverageThresholds = {
  feature: 80,
  bug: 90,
  chore: 70,
  default: 75,
}

export function parseCoverageThresholds(yamlContent: string): CoverageThresholds {
  try {
    const parsed = yaml.load(yamlContent) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== 'object') {
      return defaultCoverageThresholds
    }

    const thresholds: CoverageThresholds = { ...defaultCoverageThresholds }

    if (typeof parsed.feature === 'number' && parsed.feature >= 0 && parsed.feature <= 100) {
      thresholds.feature = parsed.feature
    }
    if (typeof parsed.bug === 'number' && parsed.bug >= 0 && parsed.bug <= 100) {
      thresholds.bug = parsed.bug
    }
    if (typeof parsed.chore === 'number' && parsed.chore >= 0 && parsed.chore <= 100) {
      thresholds.chore = parsed.chore
    }
    if (typeof parsed.default === 'number' && parsed.default >= 0 && parsed.default <= 100) {
      thresholds.default = parsed.default
    }

    return thresholds
  } catch {
    return defaultCoverageThresholds
  }
}

export function getThresholdForTrackType(
  thresholds: CoverageThresholds,
  trackType: string,
): number {
  const normalized = trackType.toLowerCase()
  if (normalized in thresholds) {
    return thresholds[normalized as keyof CoverageThresholds]
  }
  return thresholds.default
}
