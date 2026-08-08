import { describe, expect, it, mock } from 'bun:test'
import { ConvexHttpClient } from 'convex/browser'
import { Router } from './router'
import { registerEvidenceRoutes } from './evidence'

const project = {
  _id: 'jproject1234567890123456789012',
  name: 'Reading Advantage',
  slug: 'reading-advantage-llm-benchmark',
  description: 'Imported benchmark',
  path: '/srv/reading-advantage',
  createdAt: 1,
  updatedAt: 2,
}

function request(path: string): Request {
  return new Request(`http://localhost${path}`)
}

function createClient(workRuns: unknown[] = []) {
  const query = mock(async (_query: unknown, args: Record<string, unknown>) => {
    if ('projectSlug' in args) return workRuns
    if ('slug' in args) return args.slug === project.slug ? project : null
    if ('id' in args) return args.id === project._id ? project : null
    throw new Error(`Unexpected query arguments: ${JSON.stringify(args)}`)
  })
  return { query } as unknown as ConvexHttpClient
}

describe('evidence routes', () => {
  it('resolves an ID canonically before returning only that project work runs', async () => {
    const workRuns = [
      {
        projectSlug: project.slug,
        runId: 'run-1',
        status: 'succeeded',
        selectedTaskKey: 'TASK-001',
        startedAt: 100,
        finishedAt: 200,
      },
    ]
    const client = createClient(workRuns)
    const router = new Router()
    registerEvidenceRoutes(router, client)

    const match = router.match('GET', `/api/projects/${project._id}/work-runs`)!
    const response = await match.handler(
      request(`/api/projects/${project._id}/work-runs`),
      match.params,
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ project: { id: project._id, slug: project.slug }, workRuns })
    expect((client.query as any).mock.calls[2]?.[1]).toEqual({ projectSlug: project.slug })
  })

  it('returns a matching receipt with sensitive fields and paths removed', async () => {
    const startedAt = Date.parse('2026-08-08T01:00:00.000Z')
    const workRuns = [
      {
        projectSlug: project.slug,
        runId: 'run-1',
        status: 'succeeded',
        selectedTaskKey: 'TASK-001',
        startedAt,
        finishedAt: startedAt + 60_000,
      },
    ]
    const receipt = {
      taskId: 'receipt-1',
      parentSessionId: 'TASK-001',
      parentAgent: 'factory-acceptance-luna',
      childAgent: 'coder-openai-gpt-5-6-luna-fast',
      cwd: '/srv/reading-advantage/./',
      model: 'openai-codex/gpt-5.6-luna',
      promptHash: 'prompt-hash',
      outputHash: 'output-hash',
      startHead: 'abc',
      endHead: 'def',
      exitCode: 0,
      timeoutMs: 600_000,
      maxTokens: 16_000,
      startedAt: '2026-08-08T01:00:00.000Z',
      completedAt: '2026-08-08T01:01:00.000Z',
      finalOutput: 'do not send this to the browser',
      stderr: 'secret stderr',
      logPath: '/home/daniebo/.pi/agent/measure-harness/tasks/receipt-1.jsonl',
    }
    const client = createClient(workRuns)
    const router = new Router()
    registerEvidenceRoutes(router, client, {
      receiptDirectory: () => '/tmp/receipts',
      listReceiptFiles: async () => [
        '/tmp/receipts/receipt-1.json',
        '/tmp/receipts/other-task.json',
        '/tmp/receipts/other-project.json',
      ],
      readReceiptFile: async filePath => {
        if (filePath.endsWith('other-task.json')) {
          return JSON.stringify({ ...receipt, parentSessionId: 'TASK-002' })
        }
        if (filePath.endsWith('other-project.json')) {
          return JSON.stringify({ ...receipt, cwd: '/srv/another-project' })
        }
        return JSON.stringify(receipt)
      },
    })

    const path = `/api/projects/${project.slug}/pi-receipt?taskKey=TASK-001&runId=run-1`
    const match = router.match('GET', path)!
    const response = await match.handler(request(path), match.params)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.project).toEqual({ id: project._id, slug: project.slug })
    expect(body.taskKey).toBe('TASK-001')
    expect(body.runId).toBe('run-1')
    expect(body.receipts).toEqual([
      {
        taskId: 'receipt-1',
        parentSessionId: 'TASK-001',
        parentAgent: 'factory-acceptance-luna',
        childAgent: 'coder-openai-gpt-5-6-luna-fast',
        model: 'openai-codex/gpt-5.6-luna',
        promptHash: 'prompt-hash',
        outputHash: 'output-hash',
        startHead: 'abc',
        endHead: 'def',
        exitCode: 0,
        timeoutMs: 600_000,
        maxTokens: 16_000,
        startedAt: '2026-08-08T01:00:00.000Z',
        completedAt: '2026-08-08T01:01:00.000Z',
      },
    ])
    expect(JSON.stringify(body)).not.toContain('do not send this')
    expect(JSON.stringify(body)).not.toContain('secret stderr')
    expect(JSON.stringify(body)).not.toContain('/srv/reading-advantage')
    expect(JSON.stringify(body)).not.toContain('.jsonl')
  })

  it('binds receipts to the exact persisted run and its execution window', async () => {
    const startedAt = Date.parse('2026-08-08T01:00:00.000Z')
    const receipt = {
      taskId: 'stale-receipt',
      parentSessionId: 'TASK-001',
      parentAgent: 'factory-acceptance-luna',
      childAgent: 'coder-openai-gpt-5-6-luna-fast',
      cwd: '/srv/reading-advantage',
      promptHash: 'prompt-hash',
      outputHash: 'output-hash',
      exitCode: 0,
      timeoutMs: 600_000,
      maxTokens: 16_000,
      startedAt: '2026-08-08T00:00:00.000Z',
      completedAt: '2026-08-08T00:01:00.000Z',
    }
    const client = createClient([
      {
        projectSlug: project.slug,
        runId: 'run-1',
        status: 'failed',
        selectedTaskKey: 'TASK-001',
        startedAt,
        finishedAt: startedAt + 60_000,
      },
    ])
    const router = new Router()
    registerEvidenceRoutes(router, client, {
      receiptDirectory: () => '/tmp/receipts',
      listReceiptFiles: async () => ['/tmp/receipts/stale.json'],
      readReceiptFile: async () => JSON.stringify(receipt),
    })

    const wrongRun =
      `/api/projects/${project.slug}/pi-receipt?taskKey=TASK-001&runId=another-run`
    const wrongRunMatch = router.match('GET', wrongRun)!
    expect((await wrongRunMatch.handler(request(wrongRun), wrongRunMatch.params)).status).toBe(404)

    const stale = `/api/projects/${project.slug}/pi-receipt?taskKey=TASK-001&runId=run-1`
    const staleMatch = router.match('GET', stale)!
    expect((await staleMatch.handler(request(stale), staleMatch.params)).status).toBe(404)
  })

  it('requires task and run keys and fails closed for unreadable receipts', async () => {
    const startedAt = Date.parse('2026-08-08T01:00:00.000Z')
    const client = createClient([
      {
        projectSlug: project.slug,
        runId: 'run-1',
        status: 'failed',
        selectedTaskKey: 'TASK-001',
        startedAt,
        finishedAt: startedAt + 60_000,
      },
    ])
    const router = new Router()
    registerEvidenceRoutes(router, client, {
      receiptDirectory: () => '/tmp/receipts',
      listReceiptFiles: async () => {
        throw new Error('permission denied: /private/receipts')
      },
    })

    const missingKey = '/api/projects/project/pi-receipt'
    const missingKeyMatch = router.match('GET', missingKey)!
    expect(
      (await missingKeyMatch.handler(request(missingKey), missingKeyMatch.params)).status,
    ).toBe(400)

    const missingRun = `${missingKey}?taskKey=TASK-001`
    const missingRunMatch = router.match('GET', missingRun)!
    expect(
      (await missingRunMatch.handler(request(missingRun), missingRunMatch.params)).status,
    ).toBe(400)

    const unreadable = `${missingRun}&runId=run-1`
    const unreadableMatch = router.match('GET', unreadable)!
    const response = await unreadableMatch.handler(request(unreadable), unreadableMatch.params)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'not_found' })
  })
})
