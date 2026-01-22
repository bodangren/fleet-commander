export interface AgentTemplate {
  name: string
  command: string
}

export type AgentTemplateErrorCode = 'read_failed' | 'write_failed' | 'invalid_template'

export interface AgentTemplateError {
  code: AgentTemplateErrorCode
  message: string
}

export type AgentTemplatesResponse =
  | { ok: true; templates: AgentTemplate[] }
  | { ok: false; error: AgentTemplateError }

export interface AgentTemplatesUpdateRequest {
  templates: AgentTemplate[]
}

export type AgentTemplatesUpdateResponse =
  | { ok: true }
  | { ok: false; error: AgentTemplateError }
