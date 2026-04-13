import { describe, it, expect } from 'vitest'
import {
  parseVitestCoverage,
  parseCoverage,
  getThresholdForTrackType,
  defaultCoverageThresholds,
} from './coverage'

describe('coverage parser', () => {
  describe('parseVitestCoverage', () => {
    it('should parse valid coverage-summary.json with total lines pct', () => {
      const input = {
        total: {
          lines: { pct: 85.5, covered: 171, uncovered: 29, skipped: 0 },
          statements: { pct: 84.2, covered: 180, uncovered: 34, skipped: 0 },
          functions: { pct: 75.0, covered: 45, uncovered: 15, skipped: 0 },
          branches: { pct: 70.0, covered: 140, uncovered: 60, skipped: 0 },
        },
      }
      const result = parseVitestCoverage(input)
      expect(result.percentage).toBe(85.5)
      expect(result.tool).toBe('vitest')
    })

    it('should parse coverage with decimal percentage', () => {
      const input = {
        total: {
          lines: { pct: 92.34, covered: 1234, uncovered: 101, skipped: 0 },
        },
      }
      const result = parseVitestCoverage(input)
      expect(result.percentage).toBe(92.34)
    })

    it('should return 0 when coverage is 0', () => {
      const input = {
        total: {
          lines: { pct: 0, covered: 0, uncovered: 100, skipped: 0 },
        },
      }
      const result = parseVitestCoverage(input)
      expect(result.percentage).toBe(0)
    })

    it('should return 100 when coverage is 100', () => {
      const input = {
        total: {
          lines: { pct: 100, covered: 500, uncovered: 0, skipped: 0 },
        },
      }
      const result = parseVitestCoverage(input)
      expect(result.percentage).toBe(100)
    })

    it('should throw error when total lines are missing', () => {
      const input = {
        total: {
          statements: { pct: 80, covered: 80, uncovered: 20, skipped: 0 },
        },
      }
      expect(() => parseVitestCoverage(input)).toThrow('Missing total.lines in coverage data')
    })

    it('should throw error when pct is undefined', () => {
      const input = {
        total: {
          lines: { covered: 80, uncovered: 20 },
        },
      }
      expect(() => parseVitestCoverage(input)).toThrow('Missing total.lines.pct in coverage data')
    })

    it('should throw error when total is missing', () => {
      const input = {}
      expect(() => parseVitestCoverage(input)).toThrow('Missing total in coverage data')
    })

    it('should throw error on malformed input', () => {
      expect(() => parseVitestCoverage(null)).toThrow('Invalid coverage data')
      expect(() => parseVitestCoverage(undefined)).toThrow('Invalid coverage data')
      expect(() => parseVitestCoverage('not an object')).toThrow('Invalid coverage data')
    })
  })

  describe('parseCoverage', () => {
    it('should route vitest tool to vitest parser', () => {
      const input = {
        total: {
          lines: { pct: 88.0, covered: 88, uncovered: 12, skipped: 0 },
        },
      }
      const result = parseCoverage('vitest', input)
      expect(result.percentage).toBe(88.0)
      expect(result.tool).toBe('vitest')
    })

    it('should route jest tool to vitest parser (jest uses same format)', () => {
      const input = {
        total: {
          lines: { pct: 75.5, covered: 755, uncovered: 245, skipped: 0 },
        },
      }
      const result = parseCoverage('jest', input)
      expect(result.percentage).toBe(75.5)
      expect(result.tool).toBe('jest')
    })

    it('should throw error for unsupported tool', () => {
      expect(() => parseCoverage('unknown', {})).toThrow('Unsupported coverage tool: unknown')
    })
  })

  describe('threshold utilities', () => {
    it('should return correct threshold for feature track type', () => {
      expect(getThresholdForTrackType(defaultCoverageThresholds, 'feature')).toBe(80)
    })

    it('should return correct threshold for bug track type', () => {
      expect(getThresholdForTrackType(defaultCoverageThresholds, 'bug')).toBe(90)
    })

    it('should return correct threshold for chore track type', () => {
      expect(getThresholdForTrackType(defaultCoverageThresholds, 'chore')).toBe(70)
    })

    it('should return default threshold for unknown track type', () => {
      expect(getThresholdForTrackType(defaultCoverageThresholds, 'unknown')).toBe(75)
    })

    it('should return default threshold for empty track type', () => {
      expect(getThresholdForTrackType(defaultCoverageThresholds, '')).toBe(75)
    })

    it('should handle case-insensitive track type', () => {
      expect(getThresholdForTrackType(defaultCoverageThresholds, 'FEATURE')).toBe(80)
      expect(getThresholdForTrackType(defaultCoverageThresholds, 'Bug')).toBe(90)
    })
  })
})
