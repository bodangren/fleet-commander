import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC_CHANNELS,
  LogApi,
  ProjectApi,
  SettingsApi,
  TerminalApi,
  ScheduleApi,
} from '../shared/ipc'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other apts you need here.
  // ...
})

const projectApi: ProjectApi = {
  selectProject: () => ipcRenderer.invoke(IPC_CHANNELS.selectProject),
  loadProject: projectPath => ipcRenderer.invoke(IPC_CHANNELS.loadProject, projectPath),
  refreshBoard: projectPath => ipcRenderer.invoke(IPC_CHANNELS.refreshBoard, projectPath),
  getPlanDetails: request => ipcRenderer.invoke(IPC_CHANNELS.getPlanDetails, request),
  updatePlanContents: request => ipcRenderer.invoke(IPC_CHANNELS.updatePlanContents, request),
  getLastProjectPath: () => ipcRenderer.invoke(IPC_CHANNELS.getLastProjectPath),
  updateTaskStatus: request => ipcRenderer.invoke(IPC_CHANNELS.updateTaskStatus, request),
}

contextBridge.exposeInMainWorld('projectApi', projectApi)

const terminalApi: TerminalApi = {
  createSession: request => ipcRenderer.invoke(IPC_CHANNELS.terminalCreate, request),
  launchAgent: request => ipcRenderer.invoke(IPC_CHANNELS.terminalLaunchAgent, request),
  writeToSession: request => ipcRenderer.invoke(IPC_CHANNELS.terminalWrite, request),
  closeSession: request => ipcRenderer.invoke(IPC_CHANNELS.terminalClose, request),
  onSessionData: listener => {
    ipcRenderer.on(IPC_CHANNELS.terminalData, listener)
  },
  offSessionData: listener => {
    ipcRenderer.off(IPC_CHANNELS.terminalData, listener)
  },
}

contextBridge.exposeInMainWorld('terminalApi', terminalApi)

const logApi: LogApi = {
  emitLogEntry: payload => {
    ipcRenderer.send(IPC_CHANNELS.appLogEmit, payload)
  },
  onLogEntry: listener => {
    ipcRenderer.on(IPC_CHANNELS.appLog, listener)
  },
  offLogEntry: listener => {
    ipcRenderer.off(IPC_CHANNELS.appLog, listener)
  },
}

contextBridge.exposeInMainWorld('logApi', logApi)

const settingsApi: SettingsApi = {
  getAgentTemplates: () => ipcRenderer.invoke(IPC_CHANNELS.getAgentTemplates),
  setAgentTemplates: request => ipcRenderer.invoke(IPC_CHANNELS.setAgentTemplates, request),
}

contextBridge.exposeInMainWorld('settingsApi', settingsApi)

const scheduleApi: ScheduleApi = {
  start: request => ipcRenderer.invoke(IPC_CHANNELS.scheduleStart, request),
  pause: request => ipcRenderer.invoke(IPC_CHANNELS.schedulePause, request),
  resume: request => ipcRenderer.invoke(IPC_CHANNELS.scheduleResume, request),
  cancel: request => ipcRenderer.invoke(IPC_CHANNELS.scheduleCancel, request),
  getAll: () => ipcRenderer.invoke(IPC_CHANNELS.scheduleGetAll),
}

contextBridge.exposeInMainWorld('scheduleApi', scheduleApi)
