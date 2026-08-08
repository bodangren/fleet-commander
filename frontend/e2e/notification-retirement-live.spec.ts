import { expect, test, type APIRequestContext, type Page, type Request } from '@playwright/test'

const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const quietPeriodMs = 500

function isApiOrConvexUrl(url: URL): boolean {
  return (
    url.pathname.startsWith('/api/') ||
    url.port === '3210' ||
    /(?:^|\.)convex\.cloud$/i.test(url.hostname)
  )
}

interface PageTelemetry {
  waitForBackendRequestsToSettle: () => Promise<void>
  assertClean: () => void
}

interface FailedBackendRequest {
  key: string
  error: string
}

function observePage(page: Page): PageTelemetry {
  const notificationRequests: string[] = []
  const mutationRequests: string[] = []
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const failedApiRequests: FailedBackendRequest[] = []
  const failedApiResponses: string[] = []
  const successfulApiResponses = new Set<string>()
  const activeBackendRequests = new Set<Request>()
  let observedBackendRequests = 0
  let lastBackendActivityAt = Date.now()

  page.on('request', request => {
    const url = new URL(request.url())
    if (isApiOrConvexUrl(url)) {
      observedBackendRequests += 1
      activeBackendRequests.add(request)
      lastBackendActivityAt = Date.now()
    }
    if (url.pathname.startsWith('/api/notifications')) {
      notificationRequests.push(`${request.method()} ${url.pathname}`)
    }
    if (mutationMethods.has(request.method())) {
      mutationRequests.push(`${request.method()} ${url.pathname}`)
    }
  })

  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })

  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  page.on('requestfailed', request => {
    const url = new URL(request.url())
    if (isApiOrConvexUrl(url)) {
      activeBackendRequests.delete(request)
      lastBackendActivityAt = Date.now()
      failedApiRequests.push({
        key: `${request.method()} ${url.pathname}`,
        error: request.failure()?.errorText ?? 'failed',
      })
    }
  })

  page.on('response', response => {
    const url = new URL(response.url())
    if (isApiOrConvexUrl(url)) {
      lastBackendActivityAt = Date.now()
      if (response.status() >= 400) {
        failedApiResponses.push(`${response.status()} ${url.pathname}`)
      } else {
        successfulApiResponses.add(`${response.request().method()} ${url.pathname}`)
      }
    }
  })

  page.on('requestfinished', request => {
    const url = new URL(request.url())
    if (isApiOrConvexUrl(url)) {
      activeBackendRequests.delete(request)
      lastBackendActivityAt = Date.now()
    }
  })

  return {
    async waitForBackendRequestsToSettle() {
      await expect
        .poll(
          () => ({
            observed: observedBackendRequests > 0,
            active: activeBackendRequests.size,
            quiet: Date.now() - lastBackendActivityAt >= quietPeriodMs,
          }),
          { timeout: 30_000 },
        )
        .toEqual({ observed: true, active: 0, quiet: true })
    },
    assertClean() {
      const unrecoveredApiRequests = failedApiRequests.filter(
        failure => failure.error !== 'net::ERR_ABORTED' || !successfulApiResponses.has(failure.key),
      )
      expect(notificationRequests).toEqual([])
      expect(mutationRequests).toEqual([])
      expect(pageErrors).toEqual([])
      expect(consoleErrors).toEqual([])
      expect(unrecoveredApiRequests).toEqual([])
      expect(failedApiResponses).toEqual([])
    },
  }
}

async function waitForFleetHealth(request: APIRequestContext): Promise<void> {
  const response = await request.get('/api/health')
  expect(new URL(response.url()).pathname).toBe('/api/health')
  expect(response.status()).toBe(200)
}

async function coldLoad(page: Page, request: APIRequestContext, route: string): Promise<void> {
  await waitForFleetHealth(request)
  await page.goto(route, { waitUntil: 'domcontentloaded' })
}

test.describe('@live @notification-retirement', () => {
  // Serial mode gives this spec one worker/browser while Playwright supplies
  // a fresh page and browser context to each cold-load test case.
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(90_000)

  test('cold /notifications remains a truthful 404 without a global notification link', async ({
    page,
    request,
  }) => {
    const telemetry = observePage(page)

    await coldLoad(page, request, '/notifications')
    await expect(page).toHaveURL(/\/notifications$/)
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await expect(page.getByText('/notifications', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(0)
    await telemetry.waitForBackendRequestsToSettle()
    telemetry.assertClean()
  })

  test('cold /settings/notifications remains a truthful 404', async ({ page, request }) => {
    const telemetry = observePage(page)

    await coldLoad(page, request, '/settings/notifications')
    await expect(page).toHaveURL(/\/settings\/notifications$/)
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await expect(page.getByText('/settings/notifications', { exact: true })).toBeVisible()
    await telemetry.waitForBackendRequestsToSettle()
    telemetry.assertClean()
  })

  test('cold /settings/app has no global or settings notification link', async ({
    page,
    request,
  }) => {
    const telemetry = observePage(page)

    await coldLoad(page, request, '/settings/app')
    await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(0)
    const settingsNav = page.getByRole('navigation', { name: 'Settings sections' })
    await expect(settingsNav.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(
      0,
    )
    await telemetry.waitForBackendRequestsToSettle()
    telemetry.assertClean()
  })
})
