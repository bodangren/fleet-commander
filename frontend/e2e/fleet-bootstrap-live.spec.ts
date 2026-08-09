import { expect, test, type APIRequestContext, type Page, type Request } from '@playwright/test'

const preferredLiveProjectSlug = process.env.LIVE_PROJECT_SLUG
const projectSelectorGuardrailMs = 13_100
const selectorRenderToleranceMs = 100
const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

type ResourceName = 'health' | 'projects' | 'agents' | 'harnesses'
type DataSource = 'bun' | 'convex'
type LiveSliceConfig = Record<'projects' | 'agents' | 'harnesses', DataSource>

type ResourceRequest = {
  method: string
  path: string
  requestedAt: number
  respondedAt?: number
  status?: number
  failure?: string
}

type Telemetry = {
  navigationStartedAt?: number
  selectorReadyAt?: number
  pageErrors: string[]
  consoleErrors: string[]
  failedRequests: string[]
  failedApiResponses: string[]
  mutationRequests: string[]
  resources: Record<ResourceName, ResourceRequest[]>
  sliceConfig?: LiveSliceConfig
  ordering?: string
  slugResolution?: {
    requestedAt: number
    respondedAt: number
    status: number
    selectedSlug: string
  }
}

const resourceNamesByPath: Record<string, ResourceName> = {
  '/api/health': 'health',
  '/api/projects': 'projects',
  '/api/agents': 'agents',
  '/api/harnesses': 'harnesses',
}

function isBackendUrl(url: URL): boolean {
  return (
    url.pathname.startsWith('/api/') ||
    url.port === '3210' ||
    /(?:^|\.)convex\.cloud$/i.test(url.hostname)
  )
}

function resourceNameFor(request: Request): ResourceName | undefined {
  if (request.method() !== 'GET') return undefined
  return resourceNamesByPath[new URL(request.url()).pathname]
}

function firstResponse(resources: ResourceRequest[]): ResourceRequest | undefined {
  return resources.find(resource => resource.respondedAt !== undefined)
}

function observeColdLoad(page: Page): Telemetry {
  const telemetry: Telemetry = {
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
    failedApiResponses: [],
    mutationRequests: [],
    resources: {
      health: [],
      projects: [],
      agents: [],
      harnesses: [],
    },
  }
  const trackedRequests = new Map<Request, ResourceRequest>()

  page.on('request', request => {
    const url = new URL(request.url())
    const resourceName = resourceNameFor(request)
    if (resourceName) {
      const resource: ResourceRequest = {
        method: request.method(),
        path: url.pathname,
        requestedAt: Date.now(),
      }
      telemetry.resources[resourceName].push(resource)
      trackedRequests.set(request, resource)
    }
    if (mutationMethods.has(request.method())) {
      telemetry.mutationRequests.push(`${request.method()} ${url.pathname}`)
    }
  })

  page.on('pageerror', error => telemetry.pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') telemetry.consoleErrors.push(message.text())
  })

  page.on('requestfailed', request => {
    const url = new URL(request.url())
    const failure = request.failure()?.errorText ?? 'unknown failure'
    telemetry.failedRequests.push(`${request.method()} ${url.pathname}: ${failure}`)
    const resource = trackedRequests.get(request)
    if (resource) resource.failure = failure
  })

  page.on('response', response => {
    const url = new URL(response.url())
    const resource = trackedRequests.get(response.request())
    if (resource) {
      resource.respondedAt = Date.now()
      resource.status = response.status()
    }
    if (isBackendUrl(url) && response.status() >= 300) {
      telemetry.failedApiResponses.push(`${response.status()} ${url.pathname}`)
    }
  })

  return telemetry
}

async function resolveLiveProjectSlug(
  request: APIRequestContext,
  telemetry: Telemetry,
): Promise<string> {
  const requestedAt = Date.now()
  const response = await request.get('/api/projects')
  const respondedAt = Date.now()
  expect(new URL(response.url()).pathname).toBe('/api/projects')
  expect(response.status()).toBe(200)

  const projects = (await response.json()) as Array<{ slug?: string }>
  const selectedProject = projects.find(project => project.slug === preferredLiveProjectSlug)
  const selectedSlug = selectedProject?.slug ?? projects.find(project => project.slug)?.slug
  expect(selectedSlug, 'GET /api/projects must return a slug for a real project').toBeTruthy()

  telemetry.slugResolution = {
    requestedAt,
    respondedAt,
    status: response.status(),
    selectedSlug: selectedSlug!,
  }
  return selectedSlug!
}

function assertSuccessfulResourceResponse(
  telemetry: Telemetry,
  resourceName: ResourceName,
): ResourceRequest {
  const response = firstResponse(telemetry.resources[resourceName])
  expect(response, `page must request GET /api/${resourceName}`).toBeDefined()
  expect(response?.status, `GET /api/${resourceName} must return 200`).toBe(200)
  return response!
}

async function readLiveSliceConfig(page: Page, telemetry: Telemetry): Promise<LiveSliceConfig> {
  const config = await page.evaluate(async () => {
    const { getSliceConfig } = await import('/src/lib/dataAdapter.ts')
    const sliceConfig = getSliceConfig()
    return {
      projects: sliceConfig.projects,
      agents: sliceConfig.agents,
      harnesses: sliceConfig.harnesses,
    }
  })

  for (const source of Object.values(config)) {
    expect(source).toMatch(/^(bun|convex)$/)
  }
  telemetry.sliceConfig = config
  return config
}

function assertConfiguredResourceBoundary(
  telemetry: Telemetry,
  resourceName: Exclude<ResourceName, 'health'>,
  source: DataSource,
): ResourceRequest | undefined {
  if (source === 'bun') return assertSuccessfulResourceResponse(telemetry, resourceName)
  expect(
    telemetry.resources[resourceName],
    `Convex-backed ${resourceName} must not duplicate GET /api/${resourceName}`,
  ).toEqual([])
  return undefined
}

async function attachLedger(telemetry: Telemetry): Promise<void> {
  await test.info().attach('fleet-bootstrap-request-ledger', {
    body: JSON.stringify(telemetry, null, 2),
    contentType: 'application/json',
  })
}

test.describe('@live @fleet-bootstrap', () => {
  test('cold direct Quality route makes a project selector usable before optional bootstrap work can gate it', async ({
    page,
    request,
  }) => {
    const telemetry = observeColdLoad(page)

    try {
      const liveProjectSlug = await resolveLiveProjectSlug(request, telemetry)
      const route = `/settings/quality?project=${encodeURIComponent(liveProjectSlug)}&source=direct`
      const selector = page.getByRole('combobox', { name: 'Project', exact: true })

      telemetry.navigationStartedAt = Date.now()
      const navigation = page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(selector).toHaveValue(liveProjectSlug, { timeout: projectSelectorGuardrailMs })
      telemetry.selectorReadyAt = Date.now()
      await navigation

      const location = new URL(page.url())
      expect(location.pathname).toBe('/settings/quality')
      expect(location.search).toBe(`?project=${encodeURIComponent(liveProjectSlug)}&source=direct`)
      await expect(
        page.getByRole('heading', { name: 'Quality workflow', exact: true }),
      ).toBeVisible()
      await expect(page.getByText('Loading quality profiles...')).toHaveCount(0)
      await expect(page.getByText('Failed to load quality profiles')).toHaveCount(0)

      const healthResponse = assertSuccessfulResourceResponse(telemetry, 'health')
      const sliceConfig = await readLiveSliceConfig(page, telemetry)
      const projectResponse = assertConfiguredResourceBoundary(
        telemetry,
        'projects',
        sliceConfig.projects,
      )
      assertConfiguredResourceBoundary(telemetry, 'agents', sliceConfig.agents)
      const harnessResponse = assertConfiguredResourceBoundary(
        telemetry,
        'harnesses',
        sliceConfig.harnesses,
      )
      expect(telemetry.selectorReadyAt - telemetry.navigationStartedAt).toBeLessThanOrEqual(
        projectSelectorGuardrailMs,
      )

      if (projectResponse?.respondedAt && harnessResponse?.respondedAt) {
        if (harnessResponse.respondedAt > projectResponse.respondedAt) {
          // Response events and the ensuing React commit run in separate event-loop turns.
          // This is ordering tolerance only, not a harness latency budget.
          expect(telemetry.selectorReadyAt).toBeLessThanOrEqual(
            harnessResponse.respondedAt + selectorRenderToleranceMs,
          )
          telemetry.ordering =
            'harness-after-project: selector was not blocked on harness settlement'
        } else {
          telemetry.ordering =
            'harness-before-or-with-project: ordering observed without a gating assertion'
        }
      } else {
        telemetry.ordering =
          'source-aware ordering unavailable: project or harness did not use a settled Bun page request'
      }

      expect(healthResponse.respondedAt).toBeDefined()
      if (sliceConfig.projects === 'bun') {
        expect(projectResponse?.respondedAt).toBeDefined()
      } else {
        expect(telemetry.slugResolution?.status).toBe(200)
        expect(telemetry.slugResolution?.respondedAt).toBeDefined()
      }
      expect(telemetry.mutationRequests).toEqual([])
      expect(telemetry.pageErrors).toEqual([])
      expect(telemetry.consoleErrors).toEqual([])
      expect(telemetry.failedRequests).toEqual([])
      expect(telemetry.failedApiResponses).toEqual([])
    } finally {
      await attachLedger(telemetry)
    }
  })
})
