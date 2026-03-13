import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerScheduleIpcHandlers } from './schedule-ipc'
import { SchedulerService } from './scheduler-service'
import { IPC_CHANNELS, ScheduleGetResponse } from '../shared/ipc'

describe('schedule-ipc handlers', () => {
  let mockIpcMain: {
    handle: ReturnType<typeof vi.fn>
    removeHandler: ReturnType<typeof vi.fn>
  }
  let scheduler: SchedulerService
  let handlers: Map<string, (...args: unknown[]) => unknown>

  beforeEach(() => {
    handlers = new Map()
    mockIpcMain = {
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(channel, handler)
      }),
      removeHandler: vi.fn(),
    }
    scheduler = new SchedulerService()
  })

  afterEach(() => {
    scheduler.clearAll()
  })

  describe('registerScheduleIpcHandlers', () => {
    it('registers all schedule IPC channels', () => {
      registerScheduleIpcHandlers(mockIpcMain, scheduler)

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.scheduleStart,
        expect.any(Function),
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.schedulePause,
        expect.any(Function),
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.scheduleResume,
        expect.any(Function),
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.scheduleCancel,
        expect.any(Function),
      )
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.scheduleGetAll,
        expect.any(Function),
      )
    })
  })

  describe('schedule:start', () => {
    it('starts a scheduled task', async () => {
      vi.useFakeTimers()
      const launchAgent = vi.fn().mockResolvedValue({ ok: true, sessionId: 'session-1' })
      registerScheduleIpcHandlers(mockIpcMain, scheduler, launchAgent)

      const handler = handlers.get(IPC_CHANNELS.scheduleStart)!
      const result = await handler(null, {
        taskId: 'task-1',
        projectPath: '/project',
        trackId: 'track-1',
        phaseTitle: 'Phase 1',
        taskTitle: 'Task 1',
        template: { name: 'test', command: 'echo test' },
        config: { mode: 'one-time' },
      })

      expect(result).toEqual({ ok: true, scheduleId: 'task-1' })

      vi.advanceTimersByTime(0)
      await Promise.resolve()
      expect(launchAgent).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('starts an interval task', async () => {
      vi.useFakeTimers()
      const launchAgent = vi.fn().mockResolvedValue({ ok: true, sessionId: 'session-1' })
      registerScheduleIpcHandlers(mockIpcMain, scheduler, launchAgent)

      const handler = handlers.get(IPC_CHANNELS.scheduleStart)!
      const result = await handler(null, {
        taskId: 'task-2',
        projectPath: '/project',
        trackId: 'track-1',
        phaseTitle: 'Phase 1',
        taskTitle: 'Task 2',
        template: { name: 'test', command: 'echo test' },
        config: { mode: 'interval', interval: { value: 1, unit: 'minutes' } },
      })

      expect(result).toEqual({ ok: true, scheduleId: 'task-2' })
      expect(launchAgent).toHaveBeenCalledTimes(0)

      vi.advanceTimersByTime(60000)
      expect(launchAgent).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })

  describe('schedule:pause', () => {
    it('pauses a running task', async () => {
      const launchAgent = vi.fn().mockResolvedValue({ ok: true, sessionId: 'session-1' })
      registerScheduleIpcHandlers(mockIpcMain, scheduler, launchAgent)

      const startHandler = handlers.get(IPC_CHANNELS.scheduleStart)!
      await startHandler(null, {
        taskId: 'task-3',
        projectPath: '/project',
        trackId: 'track-1',
        phaseTitle: 'Phase 1',
        taskTitle: 'Task 3',
        template: { name: 'test', command: 'echo test' },
        config: { mode: 'interval', interval: { value: 1, unit: 'hours' } },
      })

      const pauseHandler = handlers.get(IPC_CHANNELS.schedulePause)!
      const result = await pauseHandler(null, { scheduleId: 'task-3' })

      expect(result).toEqual({ ok: true, status: 'paused' })
    })

    it('returns error for non-existent task', async () => {
      registerScheduleIpcHandlers(mockIpcMain, scheduler)

      const handler = handlers.get(IPC_CHANNELS.schedulePause)!
      const result = await handler(null, { scheduleId: 'nonexistent' })

      expect(result).toEqual({ ok: false, error: 'Schedule not found' })
    })
  })

  describe('schedule:resume', () => {
    it('resumes a paused task', async () => {
      const launchAgent = vi.fn().mockResolvedValue({ ok: true, sessionId: 'session-1' })
      registerScheduleIpcHandlers(mockIpcMain, scheduler, launchAgent)

      const startHandler = handlers.get(IPC_CHANNELS.scheduleStart)!
      await startHandler(null, {
        taskId: 'task-4',
        projectPath: '/project',
        trackId: 'track-1',
        phaseTitle: 'Phase 1',
        taskTitle: 'Task 4',
        template: { name: 'test', command: 'echo test' },
        config: { mode: 'interval', interval: { value: 1, unit: 'hours' } },
      })

      const pauseHandler = handlers.get(IPC_CHANNELS.schedulePause)!
      await pauseHandler(null, { scheduleId: 'task-4' })

      const resumeHandler = handlers.get(IPC_CHANNELS.scheduleResume)!
      const result = await resumeHandler(null, { scheduleId: 'task-4' })

      expect(result).toEqual({ ok: true, status: 'running' })
    })
  })

  describe('schedule:cancel', () => {
    it('cancels a scheduled task', async () => {
      const launchAgent = vi.fn().mockResolvedValue({ ok: true, sessionId: 'session-1' })
      registerScheduleIpcHandlers(mockIpcMain, scheduler, launchAgent)

      const startHandler = handlers.get(IPC_CHANNELS.scheduleStart)!
      await startHandler(null, {
        taskId: 'task-5',
        projectPath: '/project',
        trackId: 'track-1',
        phaseTitle: 'Phase 1',
        taskTitle: 'Task 5',
        template: { name: 'test', command: 'echo test' },
        config: { mode: 'one-time', delay: { value: 10, unit: 'minutes' } },
      })

      const cancelHandler = handlers.get(IPC_CHANNELS.scheduleCancel)!
      const result = await cancelHandler(null, { scheduleId: 'task-5' })

      expect(result).toEqual({ ok: true, status: 'cancelled' })
    })
  })

  describe('schedule:get-all', () => {
    it('returns all scheduled tasks', async () => {
      const launchAgent = vi.fn().mockResolvedValue({ ok: true, sessionId: 'session-1' })
      registerScheduleIpcHandlers(mockIpcMain, scheduler, launchAgent)

      const startHandler = handlers.get(IPC_CHANNELS.scheduleStart)!
      await startHandler(null, {
        taskId: 'task-a',
        projectPath: '/project',
        trackId: 'track-1',
        phaseTitle: 'Phase 1',
        taskTitle: 'Task A',
        template: { name: 'test', command: 'echo test' },
        config: { mode: 'interval', interval: { value: 1, unit: 'hours' } },
      })
      await startHandler(null, {
        taskId: 'task-b',
        projectPath: '/project',
        trackId: 'track-1',
        phaseTitle: 'Phase 1',
        taskTitle: 'Task B',
        template: { name: 'test', command: 'echo test' },
        config: { mode: 'one-time', delay: { value: 5, unit: 'minutes' } },
      })

      const getAllHandler = handlers.get(IPC_CHANNELS.scheduleGetAll)!
      const result = (await getAllHandler()) as ScheduleGetResponse

      expect(result.ok).toBe(true)
      expect(result.schedules).toHaveLength(2)
      expect(result.schedules.map((s: { id: string }) => s.id)).toContain('task-a')
      expect(result.schedules.map((s: { id: string }) => s.id)).toContain('task-b')
    })
  })
})
