import { describe, expect, it } from 'bun:test'

const REMOVED_RUNTIME_FILES = [
  'convex/notifications.ts',
  'convex/lib/notifications.ts',
  'pivot/src/routes/notifications.ts',
  'frontend/src/pages/NotificationHistoryPage.tsx',
  'frontend/src/pages/settings/NotificationSettingsSection.tsx',
  'frontend/src/lib/convex-data/notifications.ts',
] as const

const REMOVED_NOTIFICATION_ONLY_TEST_FILES = [
  'convex/schema.notifications.test.ts',
] as const

const RETIRED_ALLOWLIST_PATHS = [
  ...REMOVED_RUNTIME_FILES,
  ...REMOVED_NOTIFICATION_ONLY_TEST_FILES,
] as const

const RETIRED_NOTIFICATION_IDENTIFIERS = [
  'notifications',
  'notificationPreferences',
  'notificationType',
  'notificationChannel',
  'NotificationType',
  'NotificationChannel',
] as const

const CURRENT_DOCTOR_ALLOWLISTS = [
  'measure/orphans-allowlist.txt',
  'measure/as-any-allowlist.txt',
  'measure/godfile-allowlist.txt',
  'measure/boundary-allowlist.txt',
  'measure/status-vocabulary-allowlist.txt',
  'measure/stub-mutation-allowlist.txt',
] as const

/**
 * Reads a repository source file through Bun without importing a retired module.
 * @param path - Workspace-relative source path.
 * @returns The file's text.
 */
async function readSource(path: string): Promise<string> {
  return Bun.file(path).text()
}

/**
 * Returns production TypeScript paths matched by a Bun glob, excluding generated
 * code and test fixtures so forbidden product wiring cannot hide in test text.
 * @param pattern - Workspace-relative Bun glob pattern.
 * @returns Sorted production source paths.
 */
async function productionPaths(pattern: string): Promise<string[]> {
  const paths: string[] = []
  const glob = new Bun.Glob(pattern)

  for await (const path of glob.scan('.')) {
    if (
      path.includes('/_generated/') ||
      path.includes('/__fixtures__/') ||
      /\.(?:test|convex-test)\.tsx?$/.test(path)
    ) {
      continue
    }
    paths.push(path)
  }

  return paths.sort()
}

/**
 * Reads and concatenates the current production sources for a package boundary.
 * @param pattern - Workspace-relative Bun glob pattern.
 * @returns All matched source text.
 */
async function productionSource(pattern: string): Promise<string> {
  const paths = await productionPaths(pattern)
  return Promise.all(paths.map(readSource)).then(parts => parts.join('\n'))
}

/** Returns every production Doctor allowlist while excluding test fixtures. */
async function doctorAllowlistPaths(): Promise<string[]> {
  const paths: string[] = []
  const glob = new Bun.Glob('measure/*allowlist.txt')

  for await (const path of glob.scan('.')) {
    if (
      path.includes('/__fixtures__/') ||
      path.includes('/fixtures/') ||
      /(?:^|\/)[^/]*\.(?:test|spec|convex-test)(?:[-.][^/]*)?$/.test(path)
    ) {
      continue
    }
    paths.push(path)
  }

  return paths.sort()
}

describe('notification surface retirement contract', () => {
  it('removes notification modules, delivery helpers, and public generated API references', async () => {
    for (const path of REMOVED_RUNTIME_FILES) {
      expect(await Bun.file(path).exists(), `${path} must be retired`).toBe(false)
    }

    const generatedApi = await readSource('convex/_generated/api.d.ts')
    expect(generatedApi).not.toMatch(/(?:^|["/])notifications(?:["./]|$)/m)
    expect(generatedApi).not.toContain('lib_notifications')
    expect(generatedApi).not.toContain('deliverWebhook')
  })

  it('does not retain a notification-only schema preservation suite', async () => {
    for (const path of REMOVED_NOTIFICATION_ONLY_TEST_FILES) {
      expect(await Bun.file(path).exists(), `${path} must be retired`).toBe(false)
    }
  })

  it('does not retain retired notification paths or schema vocabulary in any Doctor allowlist', async () => {
    const allowlistPaths = await doctorAllowlistPaths()
    for (const requiredPath of CURRENT_DOCTOR_ALLOWLISTS) {
      expect(allowlistPaths).toContain(requiredPath)
    }

    for (const allowlistPath of allowlistPaths) {
      const allowlist = await readSource(allowlistPath)
      for (const retiredPath of RETIRED_ALLOWLIST_PATHS) {
        expect(allowlist, `${allowlistPath} must not retain retired ${retiredPath}`).not.toContain(retiredPath)
      }
      for (const identifier of RETIRED_NOTIFICATION_IDENTIFIERS) {
        expect(allowlist, `${allowlistPath} must not retain retired ${identifier}`).not.toMatch(
          new RegExp(`\\b${identifier}\\b`),
        )
      }
    }
  })

  it('removes historical notification tables and their vocabulary without reviving an addressable product surface', async () => {
    const schema = await readSource('convex/schema/operations.ts')
    expect(schema).not.toMatch(/^\s*notifications:\s*defineTable\(/m)
    expect(schema).not.toMatch(/^\s*notificationPreferences:\s*defineTable\(/m)
    expect(schema).not.toMatch(/\b(?:notificationType|notificationChannel)\b/)

    const convexProduction = await productionSource('convex/**/*.ts')
    expect(convexProduction).not.toMatch(
      /\b(?:notificationType|notificationChannel|NotificationType|NotificationChannel)\b/,
    )
    expect(convexProduction).not.toMatch(/\b(?:api|internal)\.notifications\b/)
    expect(convexProduction).not.toMatch(
      /\b(?:query|insert|patch|replace|delete)\(\s*['"]notifications['"]/,
    )
    expect(convexProduction).not.toMatch(
      /\b(?:query|insert|patch|replace|delete)\(\s*['"]notificationPreferences['"]/,
    )
    expect(convexProduction).not.toContain('deliverWebhook')
    expect(convexProduction).not.toMatch(/\b(?:notifications|notificationPreferences)\b/)
  })

  it('removes notification HTTP routes, orchestrator callers, and all frontend entry points', async () => {
    const pivotProduction = await productionSource('pivot/src/**/*.ts')
    expect(pivotProduction).not.toMatch(/\/api\/notifications\b/)
    expect(pivotProduction).not.toContain('registerNotificationRoutes')
    expect(pivotProduction).not.toMatch(/\bapi\.notifications\b/)

    const frontendProduction = await productionSource('frontend/src/**/*.{ts,tsx}')
    expect(frontendProduction).not.toMatch(/\/settings\/notifications\b/)
    expect(frontendProduction).not.toMatch(/['"]\/notifications['"]/)
    expect(frontendProduction).not.toMatch(/\bpath:\s*['"]notifications['"]/)
    expect(frontendProduction).not.toMatch(
      /\b(?:useNotifications|useUnreadCount|useNotificationPreferences)\b/,
    )
    expect(frontendProduction).not.toMatch(/notifications:(?:get|mark|update|create)/)
    expect(frontendProduction).not.toMatch(/Notification(?:HistoryPage|SettingsSection)/)
  })

  it('keeps the independent alerts, task history, and operational log surfaces wired', async () => {
    const router = await readSource('frontend/src/router.tsx')
    const navigation = await readSource('frontend/src/layout/AppLayout.tsx')
    const taskFailure = await readSource('pivot/src/orchestrator/stages/handleTaskFailure.ts')

    expect(router).toContain("path: 'alerts'")
    expect(router).toContain("path: 'history/tasks'")
    expect(navigation).toContain("label: 'Alerts'")
    expect(navigation).toContain("to: '/history/tasks'")
    expect(taskFailure).toContain('logAndCaptureError')
  })

  it('keeps the live browser retirement proof free of seeded or intercepted state', async () => {
    const browserProof = await readSource('frontend/e2e/notification-retirement-live.spec.ts')

    expect(browserProof).toContain('@live @notification-retirement')
    expect(browserProof).toContain("'Page not found'")
    expect(browserProof).not.toMatch(/\bseedScenario\b/)
    expect(browserProof).not.toMatch(/\bpage\.route\b/)
    expect(browserProof).not.toMatch(/\broute\.fulfill\b/)
    expect(browserProof).not.toMatch(/\bvi\.mock\b/)
    expect(browserProof).toContain("page.on('pageerror'")
    expect(browserProof).toContain("page.on('console'")
    expect(browserProof).toContain("page.on('requestfailed'")
    expect(browserProof).toContain("page.on('response'")
    expect(browserProof).toContain('new Set<Request>()')
    expect(browserProof).toContain('waitForBackendRequestsToSettle')
    expect(browserProof).toContain("request.get('/api/health')")
    expect(browserProof).toContain("test.describe.configure({ mode: 'serial' })")
    expect(browserProof).toContain('test.setTimeout(90_000)')
    expect(browserProof.match(/await page\.goto\(/g)).toHaveLength(1)
    expect(browserProof.match(/await coldLoad\(/g)).toHaveLength(3)
    expect(browserProof).toContain('expect(pageErrors).toEqual([])')
    expect(browserProof).toContain('expect(consoleErrors).toEqual([])')
    expect(browserProof).toContain("failure.error !== 'net::ERR_ABORTED'")
    expect(browserProof).toContain('successfulApiResponses.has(failure.key)')
    expect(browserProof).toContain('expect(unrecoveredApiRequests).toEqual([])')
    expect(browserProof).toContain('expect(failedApiResponses).toEqual([])')
  })
})
