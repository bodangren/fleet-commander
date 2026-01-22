import { join } from 'node:path'
import type { AgentTemplate } from '../shared/agent-templates'

export interface TemplatePersistenceFileSystem {
  readFileSync(path: string, encoding: 'utf-8'): string
  writeFileSync(path: string, data: string, encoding: 'utf-8'): void
  existsSync(path: string): boolean
  mkdirSync(path: string, options?: { recursive?: boolean }): void
}

const STORAGE_FILE = 'agent-templates.json'

interface StoredTemplates {
  templates?: unknown
}

function getStoragePath(userDataPath: string): string {
  return join(userDataPath, STORAGE_FILE)
}

function readStorage(
  fs: TemplatePersistenceFileSystem,
  userDataPath: string,
): StoredTemplates | null {
  const storagePath = getStoragePath(userDataPath)
  if (!fs.existsSync(storagePath)) {
    return null
  }

  try {
    const raw = fs.readFileSync(storagePath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as StoredTemplates
    }
  } catch {
    return null
  }

  return null
}

function normalizeTemplates(raw: unknown): AgentTemplate[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .filter((entry): entry is AgentTemplate => {
      if (typeof entry !== 'object' || entry === null) {
        return false
      }
      const { name, command } = entry as AgentTemplate
      return typeof name === 'string' && typeof command === 'string'
    })
    .map(entry => ({
      name: entry.name.trim(),
      command: entry.command.trim(),
    }))
    .filter(entry => entry.name.length > 0 && entry.command.length > 0)
}

export function getAgentTemplates(
  fs: TemplatePersistenceFileSystem,
  userDataPath: string,
): AgentTemplate[] {
  const stored = readStorage(fs, userDataPath)
  return normalizeTemplates(stored?.templates)
}

export function setAgentTemplates(
  fs: TemplatePersistenceFileSystem,
  userDataPath: string,
  templates: AgentTemplate[],
): void {
  fs.mkdirSync(userDataPath, { recursive: true })
  const storagePath = getStoragePath(userDataPath)
  const normalized = normalizeTemplates(templates)
  fs.writeFileSync(storagePath, JSON.stringify({ templates: normalized }), 'utf-8')
}
