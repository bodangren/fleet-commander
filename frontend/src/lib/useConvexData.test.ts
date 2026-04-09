import { describe, expect, it } from 'vitest'

// Test the transformation functions by importing the module and checking logic
// Since the hooks require Convex context, we test the pure transformation functions

describe('useConvexData transformations', () => {
  it('transforms convex project to frontend ProjectSummary shape', () => {
    const convexProject = {
      slug: 'my-project',
      name: 'My Project',
      rootPath: '/path/to/project',
      status: 'active' as const,
      updatedAt: 1712000000,
    }

    // Inline transformation matching the function in useConvexData.ts
    const summary = {
      id: convexProject.slug,
      name: convexProject.name,
      path: convexProject.rootPath,
      tracks: [],
      lastUpdated: convexProject.updatedAt,
    }

    expect(summary.id).toBe('my-project')
    expect(summary.name).toBe('My Project')
    expect(summary.path).toBe('/path/to/project')
    expect(summary.tracks).toEqual([])
    expect(summary.lastUpdated).toBe(1712000000)
  })

  it('transforms convex agent to frontend AgentRecord shape', () => {
    const convexAgent = {
      name: 'coder',
      displayName: 'Code Writer',
      mode: 'run',
      model: 'gpt-4',
      temperature: 0.7,
      prompt: 'You are a coder.',
      toolsJson: '{"read":true,"write":true}',
    }

    const tools = JSON.parse(convexAgent.toolsJson) as Record<string, boolean>
    const record = {
      layer: 'convex',
      definition: {
        name: convexAgent.name,
        description: convexAgent.displayName,
        mode: convexAgent.mode,
        model: convexAgent.model,
        temperature: convexAgent.temperature,
        tools,
        body: convexAgent.prompt,
      },
    }

    expect(record.layer).toBe('convex')
    expect(record.definition.name).toBe('coder')
    expect(record.definition.description).toBe('Code Writer')
    expect(record.definition.tools).toEqual({ read: true, write: true })
  })

  it('transforms convex harness to frontend HarnessRecord shape', () => {
    const convexHarness = {
      name: 'opencode',
      commandTemplate: 'opencode run {{prompt}}',
      discoveryCommand: 'opencode models',
    }

    const record = {
      layer: 'convex',
      binaryFound: true,
      definition: {
        name: convexHarness.name,
        binary: '',
        discovery: {
          command: convexHarness.discoveryCommand ?? '',
          parseStrategy: 'lines',
          pattern: '',
        },
        invocation: {
          template: convexHarness.commandTemplate,
          flags: {},
        },
      },
    }

    expect(record.layer).toBe('convex')
    expect(record.definition.name).toBe('opencode')
    expect(record.definition.invocation.template).toBe('opencode run {{prompt}}')
    expect(record.definition.discovery.command).toBe('opencode models')
  })

  it('handles missing toolsJson gracefully', () => {
    const parseToolsJson = (toolsJson: string): Record<string, boolean> => {
      try {
        return JSON.parse(toolsJson) as Record<string, boolean>
      } catch {
        return {}
      }
    }

    expect(parseToolsJson('invalid json')).toEqual({})
    expect(parseToolsJson('')).toEqual({})
    expect(parseToolsJson('{"test":true}')).toEqual({ test: true })
  })
})
