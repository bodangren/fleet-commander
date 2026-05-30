export interface HistoryFilters {
  search?: string
  status?: string
  project?: string
  agent?: string
  limit?: number
}

/**
 * Build history query
 * @param filters - The history filters to convert to query params
 * @returns Record of query parameters
 */
export function buildHistoryQuery(filters: HistoryFilters): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (filters.search) {
    result.search = filters.search
  }
  if (filters.status) {
    result.status = filters.status
  }
  if (filters.project) {
    result.project = filters.project
  }
  if (filters.agent) {
    result.agent = filters.agent
  }
  if (filters.limit !== undefined) {
    result.limit = filters.limit
  }
  return result
}

/**
 * Parse filters from URL
 * @param params - URLSearchParams to parse
 * @returns HistoryFilters object extracted from URL parameters
 */
export function parseFiltersFromURL(params: URLSearchParams): HistoryFilters {
  const filters: HistoryFilters = {}
  const search = params.get('search')
  if (search) {
    filters.search = search
  }
  const status = params.get('status')
  if (status) {
    filters.status = status
  }
  const limit = params.get('limit')
  if (limit) {
    filters.limit = parseInt(limit, 10)
  }
  const project = params.get('project')
  if (project) {
    filters.project = project
  }
  const agent = params.get('agent')
  if (agent) {
    filters.agent = agent
  }
  return filters
}

/**
 * Serialize filters to URL
 * @param filters - The history filters to serialize
 * @returns URL query string
 */
export function serializeFiltersToURL(filters: HistoryFilters): string {
  const parts: string[] = []
  if (filters.search) {
    parts.push(`search=${encodeURIComponent(filters.search)}`)
  }
  if (filters.status) {
    parts.push(`status=${encodeURIComponent(filters.status)}`)
  }
  if (filters.limit !== undefined) {
    parts.push(`limit=${filters.limit}`)
  }
  if (filters.project) {
    parts.push(`project=${encodeURIComponent(filters.project)}`)
  }
  if (filters.agent) {
    parts.push(`agent=${encodeURIComponent(filters.agent)}`)
  }
  return parts.join('&')
}

/**
 * Sanitize search query
 * @param input - The raw search input to sanitize
 * @returns Sanitized lowercase search string with special characters removed
 */
export function sanitizeSearchQuery(input: string): string {
  let cleaned = input.trim().toLowerCase()
  cleaned = cleaned.replace(/<[^>]*>/g, '')
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, '')
  cleaned = cleaned.replace(/\s+/g, ' ')
  if (!cleaned.match(/[a-z0-9]/)) {
    return ''
  }
  return cleaned
}
