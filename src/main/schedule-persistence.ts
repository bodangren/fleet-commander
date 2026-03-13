import * as fs from 'node:fs'
import * as path from 'node:path'
import { SchedulerService, ScheduleOptions } from './scheduler-service'
import { ScheduleConfig, ScheduleState } from '../shared/schedule-config'

export interface PersistedScheduleContext {
  projectPath: string
  trackId: string
  phaseTitle: string
  taskTitle: string
  template: { name: string; command: string }
}

export interface PersistedSchedule {
  id: string
  taskId: string
  mode: 'one-time' | 'interval' | 'loop'
  status: ScheduleState
  config: ScheduleConfig
  context: PersistedScheduleContext
}

const SCHEDULES_DIR = '.conductor'
const SCHEDULES_FILE = 'schedules.json'

export class SchedulePersistence {
  private getSchedulePath(projectPath: string): string {
    return path.join(projectPath, SCHEDULES_DIR, SCHEDULES_FILE)
  }

  saveSchedules(projectPath: string, schedules: PersistedSchedule[]): void {
    const schedulePath = this.getSchedulePath(projectPath)
    const dirPath = path.dirname(schedulePath)

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    const activeSchedules = schedules.filter(s => s.status === 'running' || s.status === 'paused')

    fs.writeFileSync(schedulePath, JSON.stringify(activeSchedules, null, 2), 'utf-8')
  }

  loadSchedules(projectPath: string): PersistedSchedule[] {
    const schedulePath = this.getSchedulePath(projectPath)

    if (!fs.existsSync(schedulePath)) {
      return []
    }

    try {
      const content = fs.readFileSync(schedulePath, 'utf-8')
      const schedules = JSON.parse(content) as PersistedSchedule[]
      return Array.isArray(schedules) ? schedules : []
    } catch {
      return []
    }
  }

  restoreSchedules(
    projectPath: string,
    scheduler: SchedulerService,
    launchAgent: (context: PersistedScheduleContext) => Promise<void>,
  ): void {
    const schedules = this.loadSchedules(projectPath)

    for (const schedule of schedules) {
      const options: ScheduleOptions = {
        id: schedule.id,
        mode: schedule.mode,
        delay: schedule.config.delay,
        interval: schedule.config.interval,
      }

      const callback = async () => {
        await launchAgent(schedule.context)
      }

      scheduler.schedule(options, callback)

      if (schedule.status === 'paused') {
        scheduler.pause(schedule.id)
      }
    }
  }
}
