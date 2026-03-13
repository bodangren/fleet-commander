import { IpcMain } from 'electron'
import {
  IPC_CHANNELS,
  ScheduleStartRequest,
  ScheduleStartResponse,
  ScheduleControlRequest,
  ScheduleControlResponse,
  ScheduleGetResponse,
} from '../shared/ipc'
import { SchedulerService, ScheduleOptions } from './scheduler-service'
import { ScheduleConfig } from '../shared/schedule-config'

interface LaunchAgentFn {
  (request: {
    projectPath: string
    trackId: string
    phaseTitle: string
    taskTitle: string
    template: { name: string; command: string }
  }): Promise<{ ok: boolean; sessionId?: string; error?: string }>
}

interface ScheduledTaskContext {
  taskId: string
  projectPath: string
  trackId: string
  phaseTitle: string
  taskTitle: string
  template: { name: string; command: string }
  config: ScheduleConfig
}

export function registerScheduleIpcHandlers(
  ipcMain: IpcMain,
  scheduler: SchedulerService,
  launchAgent?: LaunchAgentFn,
): void {
  const taskContexts = new Map<string, ScheduledTaskContext>()

  const launchAgentFn = launchAgent ?? (async () => ({ ok: true, sessionId: 'default' }))

  ipcMain.handle(
    IPC_CHANNELS.scheduleStart,
    async (_event, request: ScheduleStartRequest): Promise<ScheduleStartResponse> => {
      const { taskId, projectPath, trackId, phaseTitle, taskTitle, template, config } = request

      const context: ScheduledTaskContext = {
        taskId,
        projectPath,
        trackId,
        phaseTitle,
        taskTitle,
        template,
        config,
      }

      const options: ScheduleOptions = {
        id: taskId,
        mode: config.mode,
        delay: config.delay,
        interval: config.interval,
      }

      const callback = async () => {
        await launchAgentFn({
          projectPath,
          trackId,
          phaseTitle,
          taskTitle,
          template,
        })
      }

      scheduler.schedule(options, callback)
      taskContexts.set(taskId, context)

      return { ok: true, scheduleId: taskId }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.schedulePause,
    async (
      _event,
      request: ScheduleControlRequest,
    ): Promise<ScheduleControlResponse | { ok: false; error: string }> => {
      const { scheduleId } = request
      const task = scheduler.getTask(scheduleId)

      if (!task) {
        return { ok: false, error: 'Schedule not found' }
      }

      try {
        scheduler.pause(scheduleId)
        return { ok: true, status: 'paused' }
      } catch {
        return { ok: false, error: 'Failed to pause' }
      }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.scheduleResume,
    async (
      _event,
      request: ScheduleControlRequest,
    ): Promise<ScheduleControlResponse | { ok: false; error: string }> => {
      const { scheduleId } = request
      const task = scheduler.getTask(scheduleId)

      if (!task) {
        return { ok: false, error: 'Schedule not found' }
      }

      try {
        scheduler.resume(scheduleId)
        return { ok: true, status: 'running' }
      } catch {
        return { ok: false, error: 'Failed to resume' }
      }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.scheduleCancel,
    async (
      _event,
      request: ScheduleControlRequest,
    ): Promise<ScheduleControlResponse | { ok: false; error: string }> => {
      const { scheduleId } = request
      const task = scheduler.cancel(scheduleId)

      if (!task) {
        return { ok: false, error: 'Schedule not found' }
      }

      return { ok: true, status: 'cancelled' }
    },
  )

  ipcMain.handle(IPC_CHANNELS.scheduleGetAll, async (): Promise<ScheduleGetResponse> => {
    const tasks = scheduler.getAllTasks()
    const schedules = tasks.map(task => {
      const context = taskContexts.get(task.id)
      return {
        id: task.id,
        taskId: context?.taskId ?? task.id,
        status: task.status,
        config: task.options,
        nextExecutionTime: task.nextExecutionTime,
      }
    })

    return { ok: true, schedules }
  })
}
