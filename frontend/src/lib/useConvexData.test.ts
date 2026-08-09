import { describe, expect, it } from 'vitest'
import {
  convexAgentToRecord,
  convexCoverageRecordToDisplay,
  convexHarnessToRecord,
  convexProjectToSummary,
  parseToolsJson,
} from './useConvexData'

describe('useConvexData transformations', () => {
  it('transforms the registered listProjectsHandler row without obsolete rootPath/status fields', () => {
    const row = {
      _id: 'projects:internal-id',
      name: 'My Project',
      slug: 'my-project',
      description: 'Registered Convex project row',
      path: '/path/to/project',
      createdAt: 1711000000,
      updatedAt: 1712000000,
    }
    const summary = convexProjectToSummary(row)

    expect(row).not.toHaveProperty('rootPath')
    expect(row).not.toHaveProperty('status')
    expect(summary.id).toBe('projects:internal-id')
    expect(summary.slug).toBe('my-project')
    expect(summary.name).toBe('My Project')
    expect(summary.path).toBe('/path/to/project')
    expect(summary.tracks).toEqual([])
    expect(summary.lastUpdated).toBe(1712000000)
  })

  it('defaults an omitted registered project path without changing its identity', () => {
    const summary = convexProjectToSummary({
      _id: 'projects:without-path',
      name: 'Pathless Project',
      slug: 'pathless-project',
      description: 'Path is optional in the registered query row',
      createdAt: 1711000000,
      updatedAt: 1712000000,
    })

    expect(summary.id).toBe('projects:without-path')
    expect(summary.slug).toBe('pathless-project')
    expect(summary.path).toBe('')
  })

  it('transforms convex agent to frontend AgentRecord shape', () => {
    const record = convexAgentToRecord({
      name: 'coder',
      displayName: 'Code Writer',
      mode: 'run',
      model: 'gpt-4',
      temperature: 0.7,
      prompt: 'You are a coder.',
      toolsJson: '{"read":true,"write":true}',
    })

    expect(record.layer).toBe('convex')
    expect(record.definition.name).toBe('coder')
    expect(record.definition.description).toBe('Code Writer')
    expect(record.definition.tools).toEqual({ read: true, write: true })
  })

  it('transforms convex harness to frontend HarnessRecord shape', () => {
    const record = convexHarnessToRecord({
      name: 'opencode',
      commandTemplate: 'opencode run {{prompt}}',
      discoveryCommand: 'opencode models',
    })

    expect(record.layer).toBe('convex')
    expect(record.definition.name).toBe('opencode')
    expect(record.definition.invocation.template).toBe('opencode run {{prompt}}')
    expect(record.definition.discovery.command).toBe('opencode models')
  })

  it('handles missing toolsJson gracefully', () => {
    expect(parseToolsJson('invalid json')).toEqual({})
    expect(parseToolsJson('')).toEqual({})
    expect(parseToolsJson('{"test":true}')).toEqual({ test: true })
  })

  it('transforms convex coverage record to CoverageDisplay format', () => {
    const record = convexCoverageRecordToDisplay({
      projectSlug: 'test-project',
      projectId: 'proj-123',
      percentage: 85.5,
      tool: 'vitest',
      executionId: 'exec-456',
      createdAt: 1712000000000,
    })

    expect(record.projectSlug).toBe('test-project')
    expect(record.projectId).toBe('proj-123')
    expect(record.percentage).toBe(85.5)
    expect(record.tool).toBe('vitest')
    expect(record.executionId).toBe('exec-456')
    expect(record.date).toBeInstanceOf(Date)
    expect(record.date.getTime()).toBe(1712000000000)
  })

  it('handles optional executionId in coverage record', () => {
    const record = convexCoverageRecordToDisplay({
      projectSlug: 'test-project',
      projectId: 'proj-123',
      percentage: 90.0,
      tool: 'vitest',
      executionId: undefined,
      createdAt: 1712000000000,
    })

    expect(record.executionId).toBeUndefined()
    expect(record.percentage).toBe(90.0)
  })
})
