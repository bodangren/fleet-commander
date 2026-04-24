import { describe, it, expect } from 'vitest'
import {
  parseAnalysisConfig,
  getSeverityMap,
  mapSeverity,
  parseJsonAnalysisResult,
  parseTextAnalysisResult,
  parseAnalysisOutput,
  defaultSeverityMaps,
  defaultAnalysisConfig,
} from './analysis'

describe('parseAnalysisConfig', () => {
  it('returns default config for empty string', () => {
    expect(parseAnalysisConfig('')).toEqual(defaultAnalysisConfig)
  })

  it('returns default config for invalid YAML', () => {
    expect(parseAnalysisConfig('{{invalid yaml')).toEqual(defaultAnalysisConfig)
  })

  it('returns default config when tools is not an array', () => {
    expect(parseAnalysisConfig('tools: not-an-array')).toEqual(defaultAnalysisConfig)
  })

  it('parses valid config with tools', () => {
    const yaml = `
tools:
  - name: eslint
    command: npx eslint .
    output_format: json
    enabled: true
  - name: ruff
    command: ruff check .
    output_format: json
    enabled: false
`
    const config = parseAnalysisConfig(yaml)
    expect(config.tools).toHaveLength(2)
    expect(config.tools[0].name).toBe('eslint')
    expect(config.tools[0].command).toBe('npx eslint .')
    expect(config.tools[0].output_format).toBe('json')
    expect(config.tools[0].enabled).toBe(true)
    expect(config.tools[1].name).toBe('ruff')
    expect(config.tools[1].enabled).toBe(false)
  })

  it('defaults enabled to true when not specified', () => {
    const yaml = `
tools:
  - name: eslint
    command: npx eslint .
`
    const config = parseAnalysisConfig(yaml)
    expect(config.tools[0].enabled).toBe(true)
  })

  it('defaults output_format to json when not specified', () => {
    const yaml = `
tools:
  - name: eslint
    command: npx eslint .
`
    const config = parseAnalysisConfig(yaml)
    expect(config.tools[0].output_format).toBe('json')
  })

  it('skips tools without name or command', () => {
    const yaml = `
tools:
  - name: eslint
    command: npx eslint .
  - name: missing-command
  - command: missing-name
  - name: valid
    command: valid-command
`
    const config = parseAnalysisConfig(yaml)
    expect(config.tools).toHaveLength(2)
    expect(config.tools[0].name).toBe('eslint')
    expect(config.tools[1].name).toBe('valid')
  })

  it('parses custom severity_map', () => {
    const yaml = `
tools:
  - name: custom
    command: custom-tool
    severity_map:
      critical: error
      moderate: warning
      low: info
`
    const config = parseAnalysisConfig(yaml)
    expect(config.tools[0].severity_map).toEqual({
      critical: 'error',
      moderate: 'warning',
      low: 'info',
    })
  })
})

describe('getSeverityMap', () => {
  it('returns custom map when provided', () => {
    const custom = { critical: 'error' as const }
    expect(getSeverityMap('eslint', custom)).toBe(custom)
  })

  it('returns default map for known tools', () => {
    expect(getSeverityMap('eslint')).toBe(defaultSeverityMaps.eslint)
    expect(getSeverityMap('ruff')).toBe(defaultSeverityMaps.ruff)
    expect(getSeverityMap('typescript')).toBe(defaultSeverityMaps.typescript)
  })

  it('returns empty map for unknown tools', () => {
    expect(getSeverityMap('unknown-tool')).toEqual({})
  })
})

describe('mapSeverity', () => {
  it('maps eslint numeric severity', () => {
    expect(mapSeverity('eslint', 2)).toBe('error')
    expect(mapSeverity('eslint', 1)).toBe('warning')
    expect(mapSeverity('eslint', 0)).toBe('info')
  })

  it('maps eslint string severity', () => {
    expect(mapSeverity('eslint', 'error')).toBe('error')
    expect(mapSeverity('eslint', 'warning')).toBe('warning')
    expect(mapSeverity('eslint', 'info')).toBe('info')
  })

  it('maps ruff letter severity', () => {
    expect(mapSeverity('ruff', 'E')).toBe('error')
    expect(mapSeverity('ruff', 'W')).toBe('warning')
    expect(mapSeverity('ruff', 'I')).toBe('info')
  })

  it('maps typescript severity', () => {
    expect(mapSeverity('typescript', 'error')).toBe('error')
    expect(mapSeverity('typescript', 'warning')).toBe('warning')
    expect(mapSeverity('typescript', 'suggestion')).toBe('info')
  })

  it('returns info for unknown severity', () => {
    expect(mapSeverity('eslint', 'unknown')).toBe('info')
    expect(mapSeverity('unknown-tool', 'anything')).toBe('info')
  })

  it('uses custom severity map when provided', () => {
    const custom = { critical: 'error' as const, low: 'info' as const }
    expect(mapSeverity('custom', 'critical', custom)).toBe('error')
    expect(mapSeverity('custom', 'low', custom)).toBe('info')
    expect(mapSeverity('custom', 'unknown', custom)).toBe('info')
  })
})

describe('parseJsonAnalysisResult', () => {
  it('returns empty array for invalid data', () => {
    expect(parseJsonAnalysisResult('eslint', null)).toEqual([])
    expect(parseJsonAnalysisResult('eslint', 'string')).toEqual([])
    expect(parseJsonAnalysisResult('eslint', 123)).toEqual([])
  })

  it('parses eslint JSON output', () => {
    const eslintOutput = [
      {
        filePath: '/src/index.ts',
        messages: [
          { ruleId: 'no-unused-vars', message: 'x is defined but never used', line: 10, column: 5, severity: 2 },
          { ruleId: 'no-console', message: 'Unexpected console statement', line: 15, column: 1, severity: 1 },
        ],
      },
      {
        filePath: '/src/utils.ts',
        messages: [{ ruleId: 'semi', message: 'Missing semicolon', line: 20, column: 1, severity: 2 }],
      },
    ]

    const results = parseJsonAnalysisResult('eslint', eslintOutput)
    expect(results).toHaveLength(3)
    expect(results[0]).toEqual({
      tool: 'eslint',
      file: '/src/index.ts',
      line: 10,
      column: 5,
      severity: 'error',
      message: 'x is defined but never used',
      rule: 'no-unused-vars',
    })
    expect(results[1].severity).toBe('warning')
    expect(results[2].file).toBe('/src/utils.ts')
  })

  it('parses ruff JSON output', () => {
    const ruffOutput = [
      {
        filename: '/src/main.py',
        messages: [
          { code: 'E501', message: 'Line too long', location: { row: 10, column: 1 } },
          { code: 'W291', message: 'Trailing whitespace', location: { row: 20, column: 5 } },
        ],
      },
    ]

    const results = parseJsonAnalysisResult('ruff', ruffOutput)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      tool: 'ruff',
      file: '/src/main.py',
      line: 10,
      column: 1,
      severity: 'error',
      message: 'Line too long',
      rule: 'E501',
    })
    expect(results[1].severity).toBe('warning')
  })

  it('skips files without messages', () => {
    const output = [{ filePath: '/src/clean.ts' }, { filePath: '/src/empty.ts', messages: [] }]
    expect(parseJsonAnalysisResult('eslint', output)).toEqual([])
  })
})

describe('parseTextAnalysisResult', () => {
  it('returns empty array for empty output', () => {
    expect(parseTextAnalysisResult('eslint', '')).toEqual([])
    expect(parseTextAnalysisResult('eslint', null as unknown as string)).toEqual([])
  })

  it('parses eslint text output', () => {
    const output = `/src/index.ts:10:5: error - x is defined but never used [no-unused-vars]
/src/index.ts:15:1: warning - Unexpected console statement [no-console]`

    const results = parseTextAnalysisResult('eslint', output)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      tool: 'eslint',
      file: '/src/index.ts',
      line: 10,
      column: 5,
      severity: 'error',
      message: 'x is defined but never used',
      rule: 'no-unused-vars',
    })
    expect(results[1].severity).toBe('warning')
  })

  it('parses lines without rule', () => {
    const output = '/src/index.ts:10: error - some message'
    const results = parseTextAnalysisResult('eslint', output)
    expect(results[0].rule).toBeUndefined()
  })

  it('skips non-matching lines', () => {
    const output = `Starting analysis...
/src/index.ts:10:5: error - some message
Done.`
    const results = parseTextAnalysisResult('eslint', output)
    expect(results).toHaveLength(1)
  })
})

describe('parseAnalysisOutput', () => {
  it('routes to JSON parser for json format', () => {
    const output = [{ filePath: '/src/test.ts', messages: [{ message: 'test', severity: 2 }] }]
    const results = parseAnalysisOutput('eslint', 'json', output)
    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe('error')
  })

  it('routes to text parser for text format', () => {
    const output = '/src/test.ts:10:5: error - test message'
    const results = parseAnalysisOutput('eslint', 'text', output)
    expect(results).toHaveLength(1)
    expect(results[0].severity).toBe('error')
  })
})
