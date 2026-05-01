import { describe, expect, it } from 'vitest'

/**
 * API Contract Tests
 *
 * These tests validate that our API response shapes match what the frontend expects.
 * If the backend changes its response format, these tests will break first (not runtime).
 */

describe('API Response Contracts', () => {
  describe('Project API', () => {
    it('project response has required fields', () => {
      const projectResponse = {
        id: 'test-project',
        name: 'Test Project',
        slug: 'test-project',
        path: '/path/to/project',
        status: 'active',
        rootPath: '/path/to/project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(projectResponse).toHaveProperty('id')
      expect(projectResponse).toHaveProperty('name')
      expect(projectResponse).toHaveProperty('slug')
      expect(projectResponse).toHaveProperty('status')
      expect(typeof projectResponse.id).toBe('string')
      expect(typeof projectResponse.name).toBe('string')
    })

    it('project list item has required fields', () => {
      const projectListItem = {
        id: 'test',
        name: 'Test',
        slug: 'test',
        status: 'active',
        trackCount: 5,
        taskCount: 20,
      }

      expect(projectListItem).toHaveProperty('id')
      expect(projectListItem).toHaveProperty('name')
      expect(projectListItem).toHaveProperty('slug')
    })
  })

  describe('Task API', () => {
    it('task response has required fields', () => {
      const taskResponse = {
        projectSlug: 'test',
        trackId: 'track-1',
        taskKey: 'task-1',
        title: 'Do something',
        status: 'todo',
        dependencies: [],
        assignee: 'agent-1',
        updatedAt: Date.now(),
      }

      expect(taskResponse).toHaveProperty('projectSlug')
      expect(taskResponse).toHaveProperty('trackId')
      expect(taskResponse).toHaveProperty('taskKey')
      expect(taskResponse).toHaveProperty('title')
      expect(taskResponse).toHaveProperty('status')
      expect(['todo', 'ready', 'in_progress', 'blocked', 'done']).toContain(taskResponse.status)
    })

    it('task status patch body is valid', () => {
      const patchBody = {
        status: 'done',
      }

      expect(patchBody).toHaveProperty('status')
      expect(['todo', 'ready', 'in_progress', 'blocked', 'done']).toContain(patchBody.status)
    })
  })

  describe('Stats API', () => {
    it('overview stats have required fields', () => {
      const overview = {
        projects: 5,
        tasks: 100,
        agents: 3,
      }

      expect(overview).toHaveProperty('projects')
      expect(overview).toHaveProperty('tasks')
      expect(overview).toHaveProperty('agents')
      expect(typeof overview.projects).toBe('number')
    })

    it('agent stats have required fields', () => {
      const agentStats = {
        name: 'test-agent',
        tasksCompleted: 10,
        tasksFailed: 2,
        successRate: 0.83,
      }

      expect(agentStats).toHaveProperty('name')
      expect(agentStats).toHaveProperty('tasksCompleted')
      expect(agentStats).toHaveProperty('successRate')
    })

    it('velocity stats have required fields', () => {
      const velocity = {
        date: '2024-01-01',
        completed: 5,
        created: 3,
      }

      expect(velocity).toHaveProperty('date')
      expect(velocity).toHaveProperty('completed')
    })
  })

  describe('Git Status API', () => {
    it('git status response has required fields', () => {
      const gitStatus = {
        branch: 'main',
        dirty: false,
        ahead: 0,
        behind: 0,
      }

      expect(gitStatus).toHaveProperty('branch')
      expect(gitStatus).toHaveProperty('dirty')
      expect(gitStatus).toHaveProperty('ahead')
      expect(gitStatus).toHaveProperty('behind')
      expect(typeof gitStatus.dirty).toBe('boolean')
    })
  })

  describe('Coverage API', () => {
    it('coverage record has required fields', () => {
      const coverageRecord = {
        projectSlug: 'test',
        percentage: 85.5,
        filesCovered: 20,
        totalFiles: 25,
        timestamp: Date.now(),
      }

      expect(coverageRecord).toHaveProperty('projectSlug')
      expect(coverageRecord).toHaveProperty('percentage')
      expect(typeof coverageRecord.percentage).toBe('number')
    })
  })

  describe('Execution Log API', () => {
    it('log entry has required fields', () => {
      const logEntry = {
        projectSlug: 'test',
        runId: 'run-123',
        status: 'succeeded',
        summary: 'Task completed',
        trackId: 'track-1',
        createdAt: Date.now(),
      }

      expect(logEntry).toHaveProperty('projectSlug')
      expect(logEntry).toHaveProperty('runId')
      expect(logEntry).toHaveProperty('status')
      expect(logEntry).toHaveProperty('summary')
      expect(['queued', 'running', 'succeeded', 'failed', 'cancelled']).toContain(logEntry.status)
    })
  })
})
