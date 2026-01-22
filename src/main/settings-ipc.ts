import { app, ipcMain } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import type {
  AgentTemplate,
  AgentTemplatesResponse,
  AgentTemplatesUpdateRequest,
  AgentTemplatesUpdateResponse,
} from '../shared/agent-templates'
import { IPC_CHANNELS } from '../shared/ipc'
import {
  getAgentTemplates,
  setAgentTemplates,
  TemplatePersistenceFileSystem,
} from './agent-template-persistence'

export interface SettingsIpcDependencies {
  loadTemplates: () => AgentTemplatesResponse
  saveTemplates: (request: AgentTemplatesUpdateRequest) => AgentTemplatesUpdateResponse
}

export interface SettingsIpcHandlers {
  getAgentTemplates: () => AgentTemplatesResponse
  setAgentTemplates: (
    event: unknown,
    request: AgentTemplatesUpdateRequest,
  ) => AgentTemplatesUpdateResponse
}

const invalidTemplateResponse: AgentTemplatesUpdateResponse = {
  ok: false,
  error: {
    code: 'invalid_template',
    message: 'Templates must include a name and command.',
  },
}

function isValidTemplate(template: unknown): template is AgentTemplate {
  if (typeof template !== 'object' || template === null) {
    return false
  }
  const { name, command } = template as AgentTemplate
  return (
    typeof name === 'string' &&
    name.trim().length > 0 &&
    typeof command === 'string' &&
    command.trim().length > 0
  )
}

function isValidTemplateRequest(
  request: AgentTemplatesUpdateRequest | null | undefined,
): request is AgentTemplatesUpdateRequest {
  if (!request || !Array.isArray(request.templates)) {
    return false
  }
  return request.templates.every(isValidTemplate)
}

export function createSettingsHandlers(deps: SettingsIpcDependencies): SettingsIpcHandlers {
  const getAgentTemplates = () => deps.loadTemplates()
  const setAgentTemplates = (_event: unknown, request: AgentTemplatesUpdateRequest) => {
    if (!isValidTemplateRequest(request)) {
      return invalidTemplateResponse
    }
    return deps.saveTemplates(request)
  }

  return {
    getAgentTemplates,
    setAgentTemplates,
  }
}

export function registerSettingsIpcHandlers(): void {
  const fileSystem: TemplatePersistenceFileSystem = {
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
  }
  const userDataPath = app.getPath('userData')

  const loadTemplates = (): AgentTemplatesResponse => {
    try {
      return { ok: true, templates: getAgentTemplates(fileSystem, userDataPath) }
    } catch {
      return {
        ok: false,
        error: {
          code: 'read_failed',
          message: 'Failed to read agent templates.',
        },
      }
    }
  }

  const saveTemplates = (
    request: AgentTemplatesUpdateRequest,
  ): AgentTemplatesUpdateResponse => {
    try {
      setAgentTemplates(fileSystem, userDataPath, request.templates)
      return { ok: true }
    } catch {
      return {
        ok: false,
        error: {
          code: 'write_failed',
          message: 'Failed to save agent templates.',
        },
      }
    }
  }

  const handlers = createSettingsHandlers({
    loadTemplates,
    saveTemplates,
  })

  ipcMain.handle(IPC_CHANNELS.getAgentTemplates, handlers.getAgentTemplates)
  ipcMain.handle(IPC_CHANNELS.setAgentTemplates, handlers.setAgentTemplates)
}
