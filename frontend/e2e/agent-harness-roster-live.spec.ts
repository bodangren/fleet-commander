import { expect, test, type Locator, type Page, type Request } from '@playwright/test'

const mutations = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const forbiddenAction = /import|seed|save|delete|readiness|dispatch|factory|\/test(?:\/|$)/i
type Sources = Record<'agents' | 'harnesses', 'bun' | 'convex'>
type Failure = { key: string; error: string }
type Response = { key: string; status: number }
type Telemetry = {
  pageErrors: string[]
  consoleErrors: string[]
  requests: string[]
  responses: Response[]
  failedRequests: Failure[]
  mutationRequests: string[]
  forbiddenActions: string[]
}

function isBackend(url: URL): boolean {
  return (
    url.pathname.startsWith('/api/') ||
    url.port === '3210' ||
    /(?:^|\.)convex\.cloud$/i.test(url.hostname)
  )
}

function key(request: Request): string {
  const url = new URL(request.url())
  return `${request.method()} ${url.pathname}${url.search}`
}

function observe(page: Page) {
  const telemetry: Telemetry = {
    pageErrors: [],
    consoleErrors: [],
    requests: [],
    responses: [],
    failedRequests: [],
    mutationRequests: [],
    forbiddenActions: [],
  }
  const pending = new Set<Request>()
  page.on('pageerror', error => telemetry.pageErrors.push(error.message))
  page.on(
    'console',
    message => message.type() === 'error' && telemetry.consoleErrors.push(message.text()),
  )
  page.on('request', request => {
    const url = new URL(request.url())
    if (!isBackend(url)) return
    pending.add(request)
    const requestKey = key(request)
    telemetry.requests.push(requestKey)
    if (mutations.has(request.method())) telemetry.mutationRequests.push(requestKey)
    if (forbiddenAction.test(`${url.pathname}${url.search}`))
      telemetry.forbiddenActions.push(requestKey)
  })
  page.on('response', response => {
    const url = new URL(response.url())
    if (!isBackend(url)) return
    const result = { key: key(response.request()), status: response.status() }
    telemetry.responses.push(result)
  })
  page.on('requestfailed', request => {
    const url = new URL(request.url())
    if (isBackend(url)) {
      pending.delete(request)
      telemetry.failedRequests.push({
        key: key(request),
        error: request.failure()?.errorText ?? 'unknown failure',
      })
    }
  })
  page.on('requestfinished', request => pending.delete(request))
  return { telemetry, pending }
}

function successful(telemetry: Telemetry, requestKey: string): boolean {
  return telemetry.responses.some(
    response => response.key === requestKey && response.status === 200,
  )
}

async function readSources(page: Page): Promise<Sources> {
  const sources = await page.evaluate(async () => {
    const { getSliceConfig } = await import('/src/lib/dataAdapter.ts')
    const config = getSliceConfig()
    return { agents: config.agents, harnesses: config.harnesses }
  })
  for (const source of Object.values(sources)) expect(source).toMatch(/^(bun|convex)$/)
  return sources
}

async function settledState(empty: Locator, populated: Locator): Promise<'empty' | 'populated'> {
  let state: 'empty' | 'populated' | null = null
  await expect
    .poll(async () => {
      if (await empty.count()) state = 'empty'
      else if (await populated.count()) state = 'populated'
      return state
    })
    .not.toBeNull()
  return state!
}

function unrecoveredFailures(telemetry: Telemetry): Failure[] {
  return telemetry.failedRequests.filter(
    failure =>
      failure.error !== 'net::ERR_ABORTED' ||
      !telemetry.responses.some(
        response => response.key === failure.key && response.status >= 200 && response.status < 300,
      ),
  )
}

test.describe('@live @agent-harness-roster', () => {
  test('cold-loads truthful Agents and Providers states without live actions', async ({ page }) => {
    const { telemetry, pending } = observe(page)
    try {
      await page.goto('/agents', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/agents$/)
      await expect(
        page.getByRole('heading', { name: 'AI Team Org Chart', exact: true }),
      ).toBeVisible()
      await expect(page.getByText('Loading agent registry...')).toHaveCount(0)
      await expect(page.getByText(/Unable to load agent registry:/)).toHaveCount(0)
      await settledState(
        page.getByText('The agent registry is empty.'),
        page.locator('main section h4'),
      )
      const sources = await readSources(page)

      const providerReads = Promise.all(
        ['/api/providers/health', '/api/providers/fallbacks'].map(path =>
          page.waitForResponse(
            response =>
              response.request().method() === 'GET' && new URL(response.url()).pathname === path,
          ),
        ),
      )
      await page.goto('/providers', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/providers$/)
      await expect(page.getByRole('heading', { name: 'LLM Providers', exact: true })).toBeVisible()
      await expect(page.getByText('Loading providers...')).toHaveCount(0)
      await expect(page.getByText('Failed to load providers')).toHaveCount(0)
      await expect(page.getByText('Loading agent assignments...')).toHaveCount(0)
      await expect(page.getByText('Agent assignments unavailable')).toHaveCount(0)
      await settledState(
        page.getByText('No providers synced'),
        page.getByTestId('provider-status-dot'),
      )

      for (const response of await providerReads) expect(response.status()).toBe(200)
      for (const resource of ['agents', 'harnesses'] as const) {
        const requestKey = `GET /api/${resource}`
        if (sources[resource] === 'bun') expect(successful(telemetry, requestKey)).toBe(true)
        else expect(telemetry.requests).not.toContain(requestKey)
      }
      await expect.poll(() => pending.size).toBe(0)
      expect(telemetry.mutationRequests).toEqual([])
      expect(telemetry.forbiddenActions).toEqual([])
      expect(telemetry.pageErrors).toEqual([])
      expect(telemetry.consoleErrors).toEqual([])
      expect(unrecoveredFailures(telemetry)).toEqual([])
      expect(
        telemetry.responses.every(response => response.status >= 200 && response.status < 300),
      ).toBe(true)
    } finally {
      await test.info().attach('agent-harness-roster-live-telemetry', {
        body: JSON.stringify(telemetry, null, 2),
        contentType: 'application/json',
      })
    }
  })
})
