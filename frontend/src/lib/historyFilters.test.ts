import { describe, expect, it } from 'vitest'
import {
  buildHistoryQuery,
  parseFiltersFromURL,
  serializeFiltersToURL,
  sanitizeSearchQuery,
  type HistoryFilters,
} from './historyFilters'

describe('buildHistoryQuery', () => {
  it('returns empty object when no filters provided', () => {
    expect(buildHistoryQuery({})).toEqual({})
  })

  it('includes search when provided', () => {
    expect(buildHistoryQuery({ search: 'auth' })).toEqual({ search: 'auth' })
  })

  it('includes status when provided', () => {
    expect(buildHistoryQuery({ status: 'done' })).toEqual({ status: 'done' })
  })

  it('includes limit when provided', () => {
    expect(buildHistoryQuery({ limit: 20 })).toEqual({ limit: 20 })
  })

  it('includes project when provided', () => {
    expect(buildHistoryQuery({ project: 'foundation' })).toEqual({
      project: 'foundation',
    })
  })

  it('includes agent when provided', () => {
    expect(buildHistoryQuery({ agent: 'alice' })).toEqual({ agent: 'alice' })
  })

  it('omits empty string values', () => {
    expect(buildHistoryQuery({ search: '', status: '' })).toEqual({})
  })

  it('combines multiple filters', () => {
    expect(buildHistoryQuery({ search: 'bug', status: 'done', limit: 10 })).toEqual({
      search: 'bug',
      status: 'done',
      limit: 10,
    })
  })
})

describe('parseFiltersFromURL', () => {
  it('returns empty filters for empty search params', () => {
    const params = new URLSearchParams()
    expect(parseFiltersFromURL(params)).toEqual({})
  })

  it('parses search from URL', () => {
    const params = new URLSearchParams('search=auth')
    expect(parseFiltersFromURL(params)).toEqual({ search: 'auth' })
  })

  it('parses status from URL', () => {
    const params = new URLSearchParams('status=done')
    expect(parseFiltersFromURL(params)).toEqual({ status: 'done' })
  })

  it('parses limit as number from URL', () => {
    const params = new URLSearchParams('limit=25')
    expect(parseFiltersFromURL(params)).toEqual({ limit: 25 })
  })

  it('parses project from URL', () => {
    const params = new URLSearchParams('project=foundation')
    expect(parseFiltersFromURL(params)).toEqual({ project: 'foundation' })
  })

  it('parses agent from URL', () => {
    const params = new URLSearchParams('agent=alice')
    expect(parseFiltersFromURL(params)).toEqual({ agent: 'alice' })
  })

  it('parses multiple filters', () => {
    const params = new URLSearchParams('search=bug&status=done&limit=10')
    expect(parseFiltersFromURL(params)).toEqual({
      search: 'bug',
      status: 'done',
      limit: 10,
    })
  })

  it('ignores unknown URL params', () => {
    const params = new URLSearchParams('search=bug&foo=bar')
    expect(parseFiltersFromURL(params)).toEqual({ search: 'bug' })
  })
})

describe('serializeFiltersToURL', () => {
  it('returns empty string for no filters', () => {
    expect(serializeFiltersToURL({})).toBe('')
  })

  it('serializes search filter', () => {
    expect(serializeFiltersToURL({ search: 'auth' })).toBe('search=auth')
  })

  it('serializes status filter', () => {
    expect(serializeFiltersToURL({ status: 'done' })).toBe('status=done')
  })

  it('serializes limit filter', () => {
    expect(serializeFiltersToURL({ limit: 25 })).toBe('limit=25')
  })

  it('serializes multiple filters in deterministic order', () => {
    expect(serializeFiltersToURL({ search: 'bug', status: 'done' })).toBe('search=bug&status=done')
  })

  it('omits empty values', () => {
    expect(serializeFiltersToURL({ search: '', status: 'done' })).toBe('status=done')
  })

  it('round-trips with parseFiltersFromURL', () => {
    const filters: HistoryFilters = { search: 'bug', status: 'done', limit: 15 }
    const serialized = serializeFiltersToURL(filters)
    const parsed = parseFiltersFromURL(new URLSearchParams(serialized))
    expect(parsed).toEqual(filters)
  })
})

describe('sanitizeSearchQuery', () => {
  it('trims whitespace', () => {
    expect(sanitizeSearchQuery('  auth  ')).toBe('auth')
  })

  it('lowercases input', () => {
    expect(sanitizeSearchQuery('Auth')).toBe('auth')
  })

  it('removes regex special characters', () => {
    expect(sanitizeSearchQuery('test[1]')).toBe('test1')
    expect(sanitizeSearchQuery('foo.bar*')).toBe('foobar')
  })

  it('removes HTML/script tags', () => {
    expect(sanitizeSearchQuery('<script>alert(1)</script>')).toBe('alert1')
  })

  it('returns empty string for only special chars', () => {
    expect(sanitizeSearchQuery('$$$')).toBe('')
  })

  it('preserves alphanumeric and spaces', () => {
    expect(sanitizeSearchQuery('fix auth bug 123')).toBe('fix auth bug 123')
  })
})
