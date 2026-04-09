import { describe, expect, it } from 'vitest'
import {
  convexAgentToRecord,
  convexHarnessToRecord,
  convexProjectToSummary,
  parseToolsJson,
} from './useConvexData'

describe('useConvexData transformations', () => {
  it('transforms convex project to frontend ProjectSummary shape', () => {
    const summary = convexProjectToSummary({
      slug: 'my-project',
      name: 'My Project',
      rootPath: '/path/to/project',
      status: 'active' as const,
      updatedAt: 1712000000,
    })

    expect(summary.id).toBe('my-project')
    expect(summary.name).toBe('My Project')
    expect(summary.path).toBe('/path/to/project')
    expect(summary.tracks).toEqual([])
    expect(summary.lastUpdated).toBe(1712000000)
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
})
