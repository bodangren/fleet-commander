/**
 * Phase 4: Delete God-File + Wire Routes — no dead SettingsPage imports.
 *
 * Spec: measure/tracks/settings_page_refactor_20260610/spec.md
 * Plan: measure/tracks/settings_page_refactor_20260610/plan.md (Phase 4)
 *
 * Phase 4 task 3: "Update any direct imports of SettingsPage to new
 * sub-pages" and task 4: "Run orphan check: ensure no dead imports remain."
 *
 * The legacy `SettingsPage.tsx` god-file has been deleted in Phase 4, but
 * stale import statements referencing it would still break the build. This
 * test performs a live filesystem scan over the project source and asserts
 * that no source file imports the dead `SettingsPage` symbol or resolves a
 * path containing `SettingsPage`.
 *
 * Live behavior: the scan reads the actual source tree at test time, so a
 * re-introduced import is caught immediately by `bun --cwd frontend test`.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../../..')
const SCAN_DIRS = ['frontend/src', 'pivot/src', 'convex']
// Test files are excluded from the scan because they are allowed (and
// encouraged) to reference legacy symbols by name in comments and in the
// assertions that pin the contract. The scan is about production source.
const TEST_FILE = /\.(test|spec)\.[jt]sx?$/

/** Recursively walk a directory and yield every regular file path. */
function* walk(dir: string): Generator<string> {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      // Skip node_modules and dist artefacts to keep the scan fast and
      // focused on author source.
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue
      yield* walk(full)
    } else if (stat.isFile()) {
      yield full
    }
  }
}

/**
 * Read a file and return all lines containing a "SettingsPage" reference,
 * tagged with the relative path. Matches the export symbol
 * (`SettingsPage`), any `from '...SettingsPage...'` import path, and
 * any JSX element opening tag `<SettingsPage`. The legacy import paths
 * in this project were `from './SettingsPage'` and `from
 * '../pages/SettingsPage'`.
 */
function findSettingsPageReferences(file: string): string[] {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) return []
  if (TEST_FILE.test(file)) return []
  let contents: string
  try {
    contents = readFileSync(file, 'utf8')
  } catch {
    return []
  }
  const lines = contents.split(/\r?\n/)
  const hits: string[] = []
  lines.forEach((line, idx) => {
    if (/\bSettingsPage\b/.test(line)) {
      hits.push(`${relative(REPO_ROOT, file)}:${idx + 1}: ${line.trim()}`)
    }
  })
  return hits
}

describe('Phase 4: no dead SettingsPage imports remain in source', () => {
  const allHits: string[] = []
  for (const rel of SCAN_DIRS) {
    const abs = join(REPO_ROOT, rel)
    for (const file of walk(abs)) {
      allHits.push(...findSettingsPageReferences(file))
    }
  }

  it('finds zero references to SettingsPage in scanned source dirs', () => {
    if (allHits.length > 0) {
      // Surface the exact stale references so Green can repair them.
      throw new Error(
        `Found ${allHits.length} stale SettingsPage reference(s):\n` +
          allHits.map(h => `  ${h}`).join('\n'),
      )
    }
    expect(allHits).toEqual([])
  })

  it('does not have a SettingsPage.tsx file on disk', () => {
    const legacy = join(REPO_ROOT, 'frontend/src/pages/SettingsPage.tsx')
    let exists = true
    try {
      statSync(legacy)
    } catch {
      exists = false
    }
    expect(exists).toBe(false)
  })
})
