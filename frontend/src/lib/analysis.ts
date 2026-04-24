import yaml from 'js-yaml'

export type Severity = 'error' | 'warning' | 'info'

export interface ToolConfig {
  name: string
  command: string
  output_format: 'json' | 'text'
  severity_map?: Record<string, Severity>
  enabled: boolean
}

export interface AnalysisConfig {
  tools: ToolConfig[]
}

export interface AnalysisResult {
  tool: string
  file: string
  line?: number
  column?: number
  severity: Severity
  message: string
  rule?: string
}

export const defaultSeverityMaps: Record<string, Record<string, Severity>> = {
  eslint: {
    2: 'error',
    1: 'warning',
    0: 'info',
    error: 'error',
    warning: 'warning',
    info: 'info',
  },
  ruff: {
    E: 'error',
    W: 'warning',
    I: 'info',
    F: 'error',
    C: 'info',
    error: 'error',
    warning: 'warning',
    info: 'info',
  },
  typescript: {
    error: 'error',
    warning: 'warning',
    suggestion: 'info',
    message: 'info',
  },
}

function getRuffSeverity(code: string): Severity {
  if (code.length === 0) return 'info'
  const prefix = code[0].toUpperCase()
  if (prefix === 'E' || prefix === 'F') return 'error'
  if (prefix === 'W') return 'warning'
  return 'info'
}

export const defaultAnalysisConfig: AnalysisConfig = {
  tools: [],
}

export function parseAnalysisConfig(yamlContent: string): AnalysisConfig {
  try {
    const parsed = yaml.load(yamlContent, { schema: yaml.DEFAULT_SCHEMA }) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== 'object') {
      return defaultAnalysisConfig
    }

    const tools = parsed.tools
    if (!Array.isArray(tools)) {
      return defaultAnalysisConfig
    }

    const validTools: ToolConfig[] = []
    for (const tool of tools) {
      if (!tool || typeof tool !== 'object') continue
      const t = tool as Record<string, unknown>

      if (typeof t.name !== 'string' || typeof t.command !== 'string') continue

      const outputFormat = t.output_format === 'text' ? 'text' : 'json'
      const enabled = t.enabled !== false

      validTools.push({
        name: t.name,
        command: t.command,
        output_format: outputFormat,
        severity_map: typeof t.severity_map === 'object' && t.severity_map !== null
          ? (t.severity_map as Record<string, Severity>)
          : undefined,
        enabled,
      })
    }

    return { tools: validTools }
  } catch {
    return defaultAnalysisConfig
  }
}

export function getSeverityMap(toolName: string, customMap?: Record<string, Severity>): Record<string, Severity> {
  if (customMap) {
    return customMap
  }
  return defaultSeverityMaps[toolName.toLowerCase()] ?? {}
}

export function mapSeverity(
  toolName: string,
  rawSeverity: string | number,
  customMap?: Record<string, Severity>,
): Severity {
  const severityMap = getSeverityMap(toolName, customMap)
  const key = String(rawSeverity)

  if (toolName.toLowerCase() === 'ruff' && typeof rawSeverity === 'string' && rawSeverity.length > 1) {
    return getRuffSeverity(rawSeverity)
  }

  return severityMap[key] ?? 'info'
}

interface EslintMessage {
  ruleId?: string
  message: string
  line?: number
  column?: number
  severity?: number
}

interface EslintResult {
  filePath: string
  messages?: EslintMessage[]
}

interface RuffMessage {
  code?: string
  message: string
  location?: { row?: number; column?: number }
}

interface RuffResult {
  filename?: string
  messages?: RuffMessage[]
}

export function parseJsonAnalysisResult(
  toolName: string,
  data: unknown,
  customMap?: Record<string, Severity>,
): AnalysisResult[] {
  if (!data || typeof data !== 'object') {
    return []
  }

  const results: AnalysisResult[] = []
  const normalizedTool = toolName.toLowerCase()

  if (normalizedTool === 'eslint' && Array.isArray(data)) {
    for (const fileResult of data as EslintResult[]) {
      if (!fileResult.filePath || !fileResult.messages) continue
      for (const msg of fileResult.messages) {
        results.push({
          tool: toolName,
          file: fileResult.filePath,
          line: msg.line,
          column: msg.column,
          severity: mapSeverity(toolName, msg.severity ?? 0, customMap),
          message: msg.message,
          rule: msg.ruleId ?? undefined,
        })
      }
    }
  } else if (normalizedTool === 'ruff' && Array.isArray(data)) {
    for (const fileResult of data as RuffResult[]) {
      if (!fileResult.filename || !fileResult.messages) continue
      for (const msg of fileResult.messages) {
        results.push({
          tool: toolName,
          file: fileResult.filename,
          line: msg.location?.row,
          column: msg.location?.column,
          severity: mapSeverity(toolName, msg.code ?? 'info', customMap),
          message: msg.message,
          rule: msg.code ?? undefined,
        })
      }
    }
  }

  return results
}

const textLineRegex = /^(.+?):(\d+)(?::(\d+))?\s*:\s*(error|warning|info|note)\s*[-:]\s*(.+?)(?:\s*\[(.+?)\])?\s*$/

export function parseTextAnalysisResult(
  toolName: string,
  output: string,
  customMap?: Record<string, Severity>,
): AnalysisResult[] {
  if (!output || typeof output !== 'string') {
    return []
  }

  const results: AnalysisResult[] = []
  const lines = output.split('\n')

  for (const line of lines) {
    const match = line.match(textLineRegex)
    if (!match) continue

    const [, file, lineNum, colNum, severity, message, rule] = match
    results.push({
      tool: toolName,
      file,
      line: lineNum ? parseInt(lineNum, 10) : undefined,
      column: colNum ? parseInt(colNum, 10) : undefined,
      severity: mapSeverity(toolName, severity, customMap),
      message,
      rule: rule ?? undefined,
    })
  }

  return results
}

export function parseAnalysisOutput(
  toolName: string,
  outputFormat: 'json' | 'text',
  output: unknown,
  customMap?: Record<string, Severity>,
): AnalysisResult[] {
  if (outputFormat === 'json') {
    return parseJsonAnalysisResult(toolName, output, customMap)
  }
  return parseTextAnalysisResult(toolName, String(output ?? ''), customMap)
}
