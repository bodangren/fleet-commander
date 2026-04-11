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
