import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SchedulerService, ScheduledTask, ScheduleOptions } from './scheduler-service'

describe('SchedulerService', () => {
  let service: SchedulerService

  beforeEach(() => {
    service = new SchedulerService()
    vi.useFakeTimers()
  })

  afterEach(() => {
    service.clearAll()
    vi.useRealTimers()
  })

  describe('schedule', () => {
    it('schedules a one-time task with delay', () => {
      const callback = vi.fn()
      const options: ScheduleOptions = {
        id: 'task-1',
        mode: 'one-time',
        delay: { value: 5, unit: 'seconds' },
      }

      const task = service.schedule(options, callback)

      expect(task.id).toBe('task-1')
      expect(task.status).toBe('pending')
      expect(callback).not.toHaveBeenCalled()

      vi.advanceTimersByTime(5000)
      expect(callback).toHaveBeenCalledTimes(1)
      expect(task.status).toBe('completed')
    })

    it('schedules a one-time task without delay (immediate)', () => {
      const callback = vi.fn()
      const options: ScheduleOptions = {
        id: 'task-2',
        mode: 'one-time',
      }

      const task = service.schedule(options, callback)

      vi.advanceTimersByTime(0)
      expect(callback).toHaveBeenCalledTimes(1)
      expect(task.status).toBe('completed')
    })

    it('schedules an interval task that repeats', () => {
      const callback = vi.fn()
      const options: ScheduleOptions = {
        id: 'task-3',
        mode: 'interval',
        interval: { value: 1, unit: 'minutes' },
      }

      const task = service.schedule(options, callback)

      expect(task.status).toBe('running')

      vi.advanceTimersByTime(60000)
      expect(callback).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(60000)
      expect(callback).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(60000)
      expect(callback).toHaveBeenCalledTimes(3)
    })

    it('schedules a loop task with delay between iterations', () => {
      const callback = vi.fn()
      const options: ScheduleOptions = {
        id: 'task-4',
        mode: 'loop',
        delay: { value: 2, unit: 'seconds' },
      }

      const task = service.schedule(options, callback)

      expect(task.status).toBe('running')

      vi.advanceTimersByTime(0)
      expect(callback).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(2000)
      expect(callback).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(2000)
      expect(callback).toHaveBeenCalledTimes(3)
    })
  })

  describe('pause and resume', () => {
    it('pauses an interval task', () => {
      const callback = vi.fn()
      const options: ScheduleOptions = {
        id: 'task-5',
        mode: 'interval',
        interval: { value: 500, unit: 'milliseconds' },
      }

      const task = service.schedule(options, callback)
      vi.advanceTimersByTime(500)
      expect(callback).toHaveBeenCalledTimes(1)

      service.pause('task-5')
      expect(task.status).toBe('paused')

      vi.advanceTimersByTime(2000)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('resumes a paused interval task', () => {
      const callback = vi.fn()
      const options: ScheduleOptions = {
        id: 'task-6',
        mode: 'interval',
        interval: { value: 500, unit: 'milliseconds' },
      }

      const task = service.schedule(options, callback)
      vi.advanceTimersByTime(500)
      expect(callback).toHaveBeenCalledTimes(1)

      service.pause('task-6')
      vi.advanceTimersByTime(2000)
      expect(callback).toHaveBeenCalledTimes(1)

      service.resume('task-6')
      expect(task.status).toBe('running')

      vi.advanceTimersByTime(500)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('throws when pausing non-existent task', () => {
      expect(() => service.pause('nonexistent')).toThrow('Task not found')
    })
  })

  describe('cancel', () => {
    it('cancels a scheduled task', () => {
      const callback = vi.fn()
      const options: ScheduleOptions = {
        id: 'task-7',
        mode: 'one-time',
        delay: { value: 10, unit: 'seconds' },
      }

      service.schedule(options, callback)
      service.cancel('task-7')

      vi.advanceTimersByTime(10000)
      expect(callback).not.toHaveBeenCalled()
    })

    it('returns cancelled task', () => {
      const callback = vi.fn()
      const options: ScheduleOptions = {
        id: 'task-8',
        mode: 'interval',
        interval: { value: 1, unit: 'seconds' },
      }

      service.schedule(options, callback)
      const task = service.cancel('task-8')

      expect(task?.status).toBe('cancelled')
    })
  })

  describe('getTask', () => {
    it('returns task by id', () => {
      const callback = vi.fn()
      const options: ScheduleOptions = {
        id: 'task-9',
        mode: 'one-time',
      }

      service.schedule(options, callback)
      const task = service.getTask('task-9')

      expect(task?.id).toBe('task-9')
    })

    it('returns undefined for non-existent task', () => {
      expect(service.getTask('nonexistent')).toBeUndefined()
    })
  })

  describe('getAllTasks', () => {
    it('returns all scheduled tasks', () => {
      const callback = vi.fn()
      service.schedule({ id: 'task-a', mode: 'one-time' }, callback)
      service.schedule(
        { id: 'task-b', mode: 'interval', interval: { value: 1, unit: 'seconds' } },
        callback,
      )

      const tasks = service.getAllTasks()

      expect(tasks).toHaveLength(2)
      expect(tasks.map(t => t.id)).toContain('task-a')
      expect(tasks.map(t => t.id)).toContain('task-b')
    })
  })

  describe('clearAll', () => {
    it('clears all scheduled tasks', () => {
      const callback = vi.fn()
      service.schedule(
        { id: 'task-x', mode: 'one-time', delay: { value: 5, unit: 'seconds' } },
        callback,
      )
      service.schedule(
        { id: 'task-y', mode: 'interval', interval: { value: 1, unit: 'seconds' } },
        callback,
      )

      service.clearAll()

      vi.advanceTimersByTime(10000)
      expect(callback).not.toHaveBeenCalled()
      expect(service.getAllTasks()).toHaveLength(0)
    })
  })

  describe('time unit conversion', () => {
    it('correctly converts seconds', () => {
      const callback = vi.fn()
      service.schedule(
        { id: 'test-seconds', mode: 'one-time', delay: { value: 30, unit: 'seconds' } },
        callback,
      )

      vi.advanceTimersByTime(29999)
      expect(callback).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('correctly converts minutes', () => {
      const callback = vi.fn()
      service.schedule(
        { id: 'test-minutes', mode: 'one-time', delay: { value: 2, unit: 'minutes' } },
        callback,
      )

      vi.advanceTimersByTime(119999)
      expect(callback).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('correctly converts hours', () => {
      const callback = vi.fn()
      service.schedule(
        { id: 'test-hours', mode: 'one-time', delay: { value: 1, unit: 'hours' } },
        callback,
      )

      vi.advanceTimersByTime(3599999)
      expect(callback).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
