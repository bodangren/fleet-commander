import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { append, clear, generateId, getUncommittedEntries, getWalDir, markCommitted } from './wal'

const injectedWalDir = process.env.FLEET_WAL_DIR
if (!injectedWalDir) {
  throw new Error('WAL tests require FLEET_WAL_DIR to be injected by the Bun test preload')
}

const productionWalDir = join(homedir(), '.measure-fleet', 'wal')

function todayWalPath(): string {
  return join(getWalDir(), `${new Date().toISOString().slice(0, 10)}.jsonl`)
}

describe('WAL', () => {
  test('uses the preloaded temporary WAL directory and writes JSONL entries there', () => {
    expect(getWalDir()).toBe(injectedWalDir)
    expect(getWalDir()).not.toBe(productionWalDir)

    const entry = append({
      type: 'mutation',
      target: 'executionLogs.appendLog',
      args: { projectSlug: 'test', runId: 'run-1', status: 'running', summary: 'test' },
    })

    expect(entry.id).toBeTruthy()
    expect(entry.committed).toBe(false)
    const walPath = todayWalPath()
    expect(walPath.startsWith(`${injectedWalDir}/`)).toBe(true)
    expect(existsSync(walPath)).toBe(true)
    expect(readFileSync(walPath, 'utf8')).toContain('executionLogs.appendLog')
  })

  test('writes a commit marker and excludes the committed entry from replay', () => {
    const entry = append({
      type: 'mutation',
      target: 'fleetCatalog.upsertTask',
      args: { taskKey: 'task-1' },
    })

    expect(getUncommittedEntries().some(candidate => candidate.id === entry.id)).toBe(true)
    markCommitted(entry.id)

    const entries = readFileSync(todayWalPath(), 'utf8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line) as { id: string; target: string; committed: boolean })
    expect(entries).toEqual([
      expect.objectContaining({
        id: entry.id,
        target: 'fleetCatalog.upsertTask',
        committed: false,
      }),
      expect.objectContaining({ id: entry.id, target: '__wal_commit__', committed: true }),
    ])
    expect(getUncommittedEntries().some(candidate => candidate.id === entry.id)).toBe(false)
  })

  test('cleans only the injected WAL file and leaves the production home directory out of scope', () => {
    append({
      type: 'mutation',
      target: 'fleetCatalog.upsertTask',
      args: { taskKey: 'task-1' },
    })
    const walPath = todayWalPath()
    expect(existsSync(walPath)).toBe(true)

    clear()

    expect(existsSync(walPath)).toBe(false)
    expect(getWalDir()).toBe(injectedWalDir)
    expect(getWalDir()).not.toBe(productionWalDir)
  })

  test('generateId produces unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})
