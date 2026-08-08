import { describe, expect, it } from 'bun:test'

const REMOVED_RUNTIME_FILES = [
  'convex/notifications.ts',
  'convex/lib/notifications.ts',
  'pivot/src/routes/notifications.ts',
  'frontend/src/pages/NotificationHistoryPage.tsx',
  'frontend/src/pages/settings/NotificationSettingsSection.tsx',
  'frontend/src/lib/convex-data/notifications.ts',
] as const

const RETIREMENT_ALLOWLISTS = [
  'measure/orphans-allowlist.txt',
  'measure/as-any-allowlist.txt',
  'measure/godfile-allowlist.txt',
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

/**
 * Reads production sources except explicitly preserved historical-schema files.
 * @param pattern - Workspace-relative Bun glob pattern.
 * @param excludedPaths - Sources that are intentionally retained as historical data declarations.
 * @returns Concatenated active production source text.
 */
async function productionSourceExcept(
  pattern: string,
  excludedPaths: readonly string[],
): Promise<string> {
  const excluded = new Set(excludedPaths)
  const paths = (await productionPaths(pattern)).filter(path => !excluded.has(path))
  return Promise.all(paths.map(readSource)).then(parts => parts.join('\n'))
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

  it('does not retain retired notification runtime paths in Doctor allowlists', async () => {
    for (const allowlistPath of RETIREMENT_ALLOWLISTS) {
      const allowlist = await readSource(allowlistPath)
      for (const retiredPath of REMOVED_RUNTIME_FILES) {
        expect(allowlist, `${allowlistPath} must not retain retired ${retiredPath}`).not.toContain(retiredPath)
      }
    }
  })

  it('preserves historical notification tables without exposing an addressable product surface', async () => {
    const schema = await readSource('convex/schema/operations.ts')
    expect(schema).toMatch(/notifications:\s*defineTable\(/)
    expect(schema).toMatch(/notificationPreferences:\s*defineTable\(/)

    const convexProduction = await productionSource('convex/**/*.ts')
    expect(convexProduction).not.toMatch(/\b(?:api|internal)\.notifications\b/)
    expect(convexProduction).not.toMatch(
      /\b(?:query|insert|patch|replace|delete)\(\s*['"]notifications['"]/,
    )
    expect(convexProduction).not.toMatch(
      /\b(?:query|insert|patch|replace|delete)\(\s*['"]notificationPreferences['"]/,
    )
    expect(convexProduction).not.toContain('deliverWebhook')

    // The retained rows are historical data only. Their user/webhook fields may
    // remain in the schema, but no active Convex function may address either
    // retired table. This is deliberately table-scoped: a future legitimate
    // users/auth module may need a `userId` of its own.
    const activeConvex = await productionSourceExcept('convex/**/*.ts', [
      'convex/schema/operations.ts',
    ])
    expect(activeConvex).not.toMatch(/\b(?:notifications|notificationPreferences)\b/)
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
