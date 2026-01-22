import { describe, it, expect } from 'vitest'
import path from 'node:path'
import type { AgentTemplate } from '../shared/agent-templates'
import {
  getAgentTemplates,
  setAgentTemplates,
  TemplatePersistenceFileSystem,
} from './agent-template-persistence'

const createFakeFs = () => {
  const files = new Map<string, string>()
  const dirs = new Set<string>()

  const fs: TemplatePersistenceFileSystem = {
    readFileSync: (filePath: string, _encoding?: 'utf-8') => {
      const value = files.get(filePath)
      if (value === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`)
      }
      return value
    },
    writeFileSync: (filePath: string, contents: string, _encoding?: 'utf-8') => {
      files.set(filePath, contents)
    },
    existsSync: (filePath: string) => files.has(filePath) || dirs.has(filePath),
    mkdirSync: (dirPath: string) => {
      dirs.add(dirPath)
    },
  }

  return { fs, files, dirs }
}

describe('agent template persistence', () => {
  const userDataPath = '/user/data'
  const storagePath = path.join(userDataPath, 'agent-templates.json')

  it('returns empty templates when no storage exists', () => {
    const { fs } = createFakeFs()

    const result = getAgentTemplates(fs, userDataPath)

    expect(result).toEqual([])
  })

  it('returns empty templates when stored data is invalid', () => {
    const { fs, files } = createFakeFs()
    files.set(storagePath, 'not-json')

    const result = getAgentTemplates(fs, userDataPath)

    expect(result).toEqual([])
  })

  it('round-trips saved templates', () => {
    const { fs, files, dirs } = createFakeFs()
    const templates: AgentTemplate[] = [
      { name: 'Codex', command: 'codex --task \"{{task}}\"' },
    ]

    setAgentTemplates(fs, userDataPath, templates)

    expect(dirs.has(userDataPath)).toBe(true)
    expect(files.has(storagePath)).toBe(true)
    expect(getAgentTemplates(fs, userDataPath)).toEqual(templates)
  })
})
