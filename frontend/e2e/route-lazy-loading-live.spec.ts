import { expect, test, type Page, type Request } from '@playwright/test'

const analyticsModulePath = '/src/pages/AnalyticsDashboard.tsx'
const coverageChartModulePath = '/src/components/CoverageChart.tsx'
const liveProjectSlug = process.env.LIVE_PROJECT_SLUG ?? 'reading-advantage-llm-benchmark'
const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

type FailedRequest = {
  error: string
  method: string
  path: string
}

type FailedApiResponse = {
  method: string
  path: string
  status: number
}

type ResponseEvidence = FailedApiResponse

function isAnalyticsModuleRequest(request: Request): boolean {
  return new URL(request.url()).pathname === analyticsModulePath
}

function isCoverageChartModuleRequest(request: Request): boolean {
  return new URL(request.url()).pathname === coverageChartModulePath
}

function isExpectedAnalyticsChunkDiagnostic(message: string): boolean {
  return (
    message.includes(analyticsModulePath) ||
    /Failed to fetch dynamically imported module|Importing a module script failed/.test(message)
  )
}

function observeRequests(page: Page) {
  const analyticsModuleRequests: Request[] = []
  const coverageChartModuleRequests: Request[] = []
  const consoleErrors: string[] = []
  const failedApiResponses: FailedApiResponse[] = []
  const failedRequests: FailedRequest[] = []
  const mutations: string[] = []
  const pageErrors: string[] = []
  const responses: ResponseEvidence[] = []

  page.on('request', request => {
    const url = new URL(request.url())
    if (isAnalyticsModuleRequest(request)) analyticsModuleRequests.push(request)
    if (isCoverageChartModuleRequest(request)) coverageChartModuleRequests.push(request)
    if (mutationMethods.has(request.method())) mutations.push(`${request.method()} ${url.pathname}`)
  })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('requestfailed', request => {
    const url = new URL(request.url())
    failedRequests.push({
      method: request.method(),
      path: url.pathname,
      error: request.failure()?.errorText ?? 'unknown failure',
    })
  })
  page.on('response', response => {
    const url = new URL(response.url())
    const evidence = {
      method: response.request().method(),
      path: url.pathname,
      status: response.status(),
    }
    responses.push(evidence)
    if (url.pathname.startsWith('/api/') && (response.status() < 200 || response.status() >= 300))
      failedApiResponses.push(evidence)
  })

  return {
    analyticsModuleRequests,
    coverageChartModuleRequests,
    consoleErrors,
    failedApiResponses,
    failedRequests,
    mutations,
    pageErrors,
    responses,
  }
}

function unrecoveredFailedRequests(observed: ReturnType<typeof observeRequests>) {
  return observed.failedRequests.filter(
    failure =>
      failure.error !== 'net::ERR_ABORTED' ||
      !observed.responses.some(
        response =>
          response.method === failure.method &&
          response.path === failure.path &&
          response.status >= 200 &&
          response.status < 300,
      ),
  )
}

function assertNoJourneyFailures(observed: ReturnType<typeof observeRequests>) {
  expect(observed.pageErrors).toEqual([])
  expect(observed.consoleErrors).toEqual([])
  expect(unrecoveredFailedRequests(observed)).toEqual([])
  expect(observed.failedApiResponses).toEqual([])
  expect(observed.mutations).toEqual([])
}

function assertOnlyExpectedOfflineAnalyticsChunkFailure(
  observed: ReturnType<typeof observeRequests>,
) {
  expect(observed.failedRequests.filter(failure => failure.path === analyticsModulePath)).toEqual([
    {
      method: 'GET',
      path: analyticsModulePath,
      error: 'net::ERR_INTERNET_DISCONNECTED',
    },
  ])
  const browserAssetFailures = observed.failedRequests.filter(
    failure => failure.path !== analyticsModulePath,
  )
  expect(browserAssetFailures.length).toBeLessThanOrEqual(1)
  expect(
    browserAssetFailures.every(
      failure =>
        failure.method === 'GET' &&
        failure.path === '/favicon.svg' &&
        failure.error === 'net::ERR_INTERNET_DISCONNECTED',
    ),
  ).toBe(true)
  expect(observed.failedApiResponses).toEqual([])
  expect(observed.mutations).toEqual([])
  expect(observed.pageErrors.filter(error => !isExpectedAnalyticsChunkDiagnostic(error))).toEqual(
    [],
  )
  const genericResourceErrors = observed.consoleErrors.filter(
    error => error === 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED',
  )
  expect(genericResourceErrors).toHaveLength(observed.failedRequests.length)
  expect(
    observed.consoleErrors.filter(
      error =>
        error !== 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED' &&
        !isExpectedAnalyticsChunkDiagnostic(error),
    ),
  ).toEqual([])
}

test.describe('@live route-level lazy loading', () => {
  test('loads the Analytics route module only after navigation and does not mutate live state', async ({
    page,
  }) => {
    const observed = observeRequests(page)

    await page.goto('/portfolio', { waitUntil: 'domcontentloaded' })
    const analyticsLink = page.getByRole('link', { name: 'Analytics', exact: true })
    await expect(analyticsLink).toBeVisible()

    // This is a browser-network assertion, not a router mock or a source
    // regex: the cold shell must not request the Analytics route module.
    expect(observed.analyticsModuleRequests).toEqual([])

    const analyticsModuleRequest = page.waitForRequest(isAnalyticsModuleRequest)
    await analyticsLink.click()
    await analyticsModuleRequest
    await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
    await page.waitForLoadState('networkidle')
    assertNoJourneyFailures(observed)
  })

  test('renders the route-load error surface when an uncached route chunk cannot be fetched', async ({
    page,
  }) => {
    const observed = observeRequests(page)

    await page.goto('/portfolio', { waitUntil: 'domcontentloaded' })
    const analyticsLink = page.getByRole('link', { name: 'Analytics', exact: true })
    await expect(analyticsLink).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(observed.analyticsModuleRequests).toEqual([])

    // Going offline is a real browser transport failure, not request
    // interception. The app has already loaded; this makes only the deferred
    // Analytics route chunk unavailable.
    await page.context().setOffline(true)
    try {
      await analyticsLink.click()
      await expect(page.getByRole('alert')).toContainText('Unable to load this page')
    } finally {
      await page.context().setOffline(false)
    }

    assertOnlyExpectedOfflineAnalyticsChunkFailure(observed)
  })

  test('defers the Project View coverage chart module until its heavy tab is selected', async ({
    page,
  }) => {
    const observed = observeRequests(page)

    await page.goto(`/project/${encodeURIComponent(liveProjectSlug)}`, {
      waitUntil: 'domcontentloaded',
    })
    const coverageTab = page.getByRole('button', { name: 'Coverage', exact: true })
    await expect(coverageTab).toBeVisible()

    // A fresh browser context must not request the chart implementation while
    // the default Sprint Board tab is active.
    expect(observed.coverageChartModuleRequests).toEqual([])

    const coverageModuleRequest = page.waitForRequest(isCoverageChartModuleRequest)
    await coverageTab.click()
    await coverageModuleRequest
    await expect(page.getByText('Coverage Trend', { exact: true })).toBeVisible()
    await page.waitForLoadState('networkidle')
    assertNoJourneyFailures(observed)
  })
})
