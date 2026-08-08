import { afterAll, afterEach, beforeEach } from 'bun:test'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const testRoot = join('/tmp', `fleet-commander-pivot-tests-${process.pid}`)
const testWalDir = join(testRoot, 'wal')

// Set this before any test module imports the WAL implementation.
process.env.FLEET_WAL_DIR = testWalDir

function clearWalDir(): void {
  if (existsSync(testWalDir)) {
    rmSync(testWalDir, { recursive: true, force: true })
  }
}

function prepareWalDir(): void {
  clearWalDir()
  mkdirSync(testWalDir, { recursive: true })
}

beforeEach(prepareWalDir)
afterEach(clearWalDir)
afterAll(() => {
  if (existsSync(testRoot)) {
    rmSync(testRoot, { recursive: true, force: true })
  }
})
