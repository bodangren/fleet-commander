import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SchedulePersistence, PersistedSchedule } from './schedule-persistence'
import { SchedulerService } from './scheduler-service'
import * as fs from 'node:fs'
import * as path from 'node:path'

vi.mock('node:fs')

describe('SchedulePersistence', () => {
  let persistence: SchedulePersistence
  let scheduler: SchedulerService
  const mockProjectPath = '/test/project'
  const mockSchedulePath = path.join(mockProjectPath, '.conductor', 'schedules.json')

  beforeEach(() => {
    scheduler = new SchedulerService()
    persistence = new SchedulePersistence()
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('[]')
    vi.mocked(fs.writeFileSync).mockReturnValue()
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined)
  })

  afterEach(() => {
    scheduler.clearAll()
    vi.clearAllMocks()
  })

  describe('saveSchedules', () => {
    it('saves schedules to JSON file', () => {
      const schedules: PersistedSchedule[] = [
        {
          id: 'task-1',
          taskId: 'task-1',
          mode: 'interval',
          status: 'running',
          config: { mode: 'interval', interval: { value: 5, unit: 'minutes' } },
          context: {
            projectPath: mockProjectPath,
            trackId: 'track-1',
            phaseTitle: 'Phase 1',
            taskTitle: 'Task 1',
            template: { name: 'test', command: 'echo test' },
          },
        },
      ]

      persistence.saveSchedules(mockProjectPath, schedules)

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockSchedulePath,
        expect.stringContaining('"id": "task-1"'),
        'utf-8',
      )
    })

    it('creates directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      persistence.saveSchedules(mockProjectPath, [])

      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/project/.conductor', { recursive: true })
    })

    it('only saves running or paused schedules', () => {
      const schedules: PersistedSchedule[] = [
        {
          id: 'task-1',
          taskId: 'task-1',
          mode: 'interval',
          status: 'running',
          config: { mode: 'interval', interval: { value: 5, unit: 'minutes' } },
          context: {
            projectPath: mockProjectPath,
            trackId: 'track-1',
            phaseTitle: 'Phase 1',
            taskTitle: 'Task 1',
            template: { name: 'test', command: 'echo test' },
          },
        },
        {
          id: 'task-2',
          taskId: 'task-2',
          mode: 'one-time',
          status: 'completed',
          config: { mode: 'one-time' },
          context: {
            projectPath: mockProjectPath,
            trackId: 'track-1',
            phaseTitle: 'Phase 1',
            taskTitle: 'Task 2',
            template: { name: 'test', command: 'echo test' },
          },
        },
      ]

      persistence.saveSchedules(mockProjectPath, schedules)

      const savedData = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
      const parsed = JSON.parse(savedData)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].id).toBe('task-1')
    })
  })

  describe('loadSchedules', () => {
    it('loads schedules from JSON file', () => {
      const savedSchedules = [
        {
          id: 'task-1',
          taskId: 'task-1',
          mode: 'interval',
          status: 'paused',
          config: { mode: 'interval', interval: { value: 5, unit: 'minutes' } },
          context: {
            projectPath: mockProjectPath,
            trackId: 'track-1',
            phaseTitle: 'Phase 1',
            taskTitle: 'Task 1',
            template: { name: 'test', command: 'echo test' },
          },
        },
      ]

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedSchedules))

      const loaded = persistence.loadSchedules(mockProjectPath)

      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe('task-1')
      expect(loaded[0].status).toBe('paused')
    })

    it('returns empty array if file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const loaded = persistence.loadSchedules(mockProjectPath)

      expect(loaded).toEqual([])
    })

    it('returns empty array if file is invalid JSON', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json')

      const loaded = persistence.loadSchedules(mockProjectPath)

      expect(loaded).toEqual([])
    })
  })

  describe('restoreSchedules', () => {
    it('restores paused schedules to scheduler', () => {
      vi.useFakeTimers()
      const launchAgent = vi.fn().mockResolvedValue({ ok: true })

      const savedSchedules: PersistedSchedule[] = [
        {
          id: 'task-1',
          taskId: 'task-1',
          mode: 'interval',
          status: 'paused',
          config: { mode: 'interval', interval: { value: 5, unit: 'minutes' } },
          context: {
            projectPath: mockProjectPath,
            trackId: 'track-1',
            phaseTitle: 'Phase 1',
            taskTitle: 'Task 1',
            template: { name: 'test', command: 'echo test' },
          },
        },
      ]

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedSchedules))

      persistence.restoreSchedules(mockProjectPath, scheduler, launchAgent)

      const tasks = scheduler.getAllTasks()
      expect(tasks).toHaveLength(1)
      expect(tasks[0].status).toBe('paused')

      vi.useRealTimers()
    })

    it('restores running schedules to scheduler', () => {
      vi.useFakeTimers()
      const launchAgent = vi.fn().mockResolvedValue({ ok: true })

      const savedSchedules: PersistedSchedule[] = [
        {
          id: 'task-2',
          taskId: 'task-2',
          mode: 'interval',
          status: 'running',
          config: { mode: 'interval', interval: { value: 10, unit: 'minutes' } },
          context: {
            projectPath: mockProjectPath,
            trackId: 'track-1',
            phaseTitle: 'Phase 1',
            taskTitle: 'Task 2',
            template: { name: 'test', command: 'echo test' },
          },
        },
      ]

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(savedSchedules))

      persistence.restoreSchedules(mockProjectPath, scheduler, launchAgent)

      const tasks = scheduler.getAllTasks()
      expect(tasks).toHaveLength(1)
      expect(tasks[0].status).toBe('running')

      vi.useRealTimers()
    })
  })
})
