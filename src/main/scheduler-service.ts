import { ScheduleMode, TimeUnit, ScheduleState } from '../shared/schedule-config'

export interface ScheduleOptions {
  id: string
  mode: ScheduleMode
  delay?: { value: number; unit: TimeUnit }
  interval?: { value: number; unit: TimeUnit }
}

export interface ScheduledTask {
  id: string
  mode: ScheduleMode
  status: ScheduleState
  options: ScheduleOptions
  nextExecutionTime?: number
}

const UNIT_TO_MS: Record<TimeUnit, number> = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
}

export class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map()
  private timers: Map<string, NodeJS.Timeout | number> = new Map()
  private intervals: Map<string, NodeJS.Timeout | number> = new Map()
  private callbacks: Map<string, () => void> = new Map()

  schedule(options: ScheduleOptions, callback: () => void): ScheduledTask {
    const { id, mode, delay, interval } = options

    this.callbacks.set(id, callback)

    const now = Date.now()
    const task: ScheduledTask = {
      id,
      mode,
      status: mode === 'one-time' ? 'pending' : 'running',
      options,
    }

    this.tasks.set(id, task)

    if (mode === 'one-time') {
      const delayMs = delay ? delay.value * UNIT_TO_MS[delay.unit] : 0
      task.nextExecutionTime = now + delayMs
      const timer = setTimeout(() => {
        callback()
        task.status = 'completed'
        task.nextExecutionTime = undefined
        this.timers.delete(id)
      }, delayMs)
      this.timers.set(id, timer)
    } else if (mode === 'interval') {
      if (!interval) {
        throw new Error('Interval mode requires interval value')
      }
      const intervalMs = interval.value * UNIT_TO_MS[interval.unit]
      task.nextExecutionTime = now + intervalMs
      const timer = setInterval(() => {
        callback()
        task.nextExecutionTime = Date.now() + intervalMs
      }, intervalMs)
      this.intervals.set(id, timer)
    } else if (mode === 'loop') {
      if (!delay) {
        throw new Error('Loop mode requires delay value')
      }
      const delayMs = delay.value * UNIT_TO_MS[delay.unit]
      task.nextExecutionTime = now + delayMs
      callback()
      const timer = setInterval(() => {
        callback()
        task.nextExecutionTime = Date.now() + delayMs
      }, delayMs)
      this.intervals.set(id, timer)
    }

    return task
  }

  pause(id: string): void {
    const task = this.tasks.get(id)
    if (!task) {
      throw new Error('Task not found')
    }

    const timer = this.intervals.get(id)
    if (timer) {
      clearInterval(timer as NodeJS.Timeout)
      this.intervals.delete(id)
    }

    task.status = 'paused'
    task.nextExecutionTime = undefined
  }

  resume(id: string): void {
    const task = this.tasks.get(id)
    if (!task) {
      throw new Error('Task not found')
    }

    if (task.status !== 'paused') {
      return
    }

    const callback = this.callbacks.get(id)
    if (!callback) {
      throw new Error('Callback not found for task')
    }

    const { mode, delay, interval } = task.options
    const now = Date.now()

    task.status = 'running'

    if (mode === 'interval' && interval) {
      const intervalMs = interval.value * UNIT_TO_MS[interval.unit]
      task.nextExecutionTime = now + intervalMs
      const timer = setInterval(() => {
        callback()
        task.nextExecutionTime = Date.now() + intervalMs
      }, intervalMs)
      this.intervals.set(id, timer)
    } else if (mode === 'loop' && delay) {
      const delayMs = delay.value * UNIT_TO_MS[delay.unit]
      task.nextExecutionTime = now + delayMs
      callback()
      const timer = setInterval(() => {
        callback()
        task.nextExecutionTime = Date.now() + delayMs
      }, delayMs)
      this.intervals.set(id, timer)
    }
  }

  cancel(id: string): ScheduledTask | undefined {
    const task = this.tasks.get(id)
    if (!task) {
      return undefined
    }

    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer as NodeJS.Timeout)
      this.timers.delete(id)
    }

    const interval = this.intervals.get(id)
    if (interval) {
      clearInterval(interval as NodeJS.Timeout)
      this.intervals.delete(id)
    }

    this.callbacks.delete(id)
    task.status = 'cancelled'
    this.tasks.delete(id)
    return task
  }

  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id)
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values())
  }

  clearAll(): void {
    for (const id of this.timers.keys()) {
      const timer = this.timers.get(id)
      if (timer) clearTimeout(timer as NodeJS.Timeout)
    }
    for (const id of this.intervals.keys()) {
      const interval = this.intervals.get(id)
      if (interval) clearInterval(interval as NodeJS.Timeout)
    }
    this.timers.clear()
    this.intervals.clear()
    this.callbacks.clear()
    this.tasks.clear()
  }
}
