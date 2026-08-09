import { expect, test, type Page, type Request } from '@playwright/test'

const analyticsModulePath = '/src/pages/AnalyticsDashboard.tsx'
const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function isAnalyticsModuleRequest(request: Request): boolean {
  return new URL(request.url()).pathname === analyticsModulePath
}

function observeRequests(page: Page) {
  const analyticsModuleRequests: Request[] = []
  const mutations: string[] = []

  page.on('request', request => {
    const url = new URL(request.url())
    if (isAnalyticsModuleRequest(request)) analyticsModuleRequests.push(request)
    if (mutationMethods.has(request.method())) mutations.push(`${request.method()} ${url.pathname}`)
  })

  return { analyticsModuleRequests, mutations }
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
    expect(observed.mutations).toEqual([])
  })

  test('renders the route-load error surface when an uncached route chunk cannot be fetched', async ({
    page,
  }) => {
    const observed = observeRequests(page)

    await page.goto('/portfolio', { waitUntil: 'domcontentloaded' })
    const analyticsLink = page.getByRole('link', { name: 'Analytics', exact: true })
    await expect(analyticsLink).toBeVisible()
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

    expect(observed.mutations).toEqual([])
  })
})
