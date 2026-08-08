import { readdir, readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { receiptDir, type PiTaskReceipt } from '../orchestrator/piExecutor'
import { resolveProject, type ProjectRecord } from './projectCatalog'
import { Router, badRequest, json, notFound } from './router'

/**
 * Safe, browser-readable subset of a Pi receipt.
 */
export interface SanitizedPiReceipt {
  taskId: string
  parentSessionId: string
  parentAgent: string
  childAgent: string
  model?: string
  promptHash: string
  outputHash: string
  startHead?: string
  endHead?: string
  exitCode: number
  timeoutMs: number
  maxTokens?: number
  startedAt: string
  completedAt: string
}

/**
 * Filesystem seams used by evidence route tests.
 */
export interface EvidenceRouteDependencies {
  receiptDirectory?: () => string
  listReceiptFiles?: (directory: string) => Promise<string[]>
  readReceiptFile?: (filePath: string) => Promise<string>
}

type WorkRun = {
  projectSlug: string
  runId: string
  status: string
  selectedTaskKey?: string
  runnerHost?: string
  startedAt: number
  finishedAt?: number
}

const defaultDependencies: Required<EvidenceRouteDependencies> = {
  receiptDirectory: receiptDir,
  listReceiptFiles: async directory => {
    const entries = await readdir(directory, { withFileTypes: true })
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(entry => resolve(directory, entry.name))
  },
  readReceiptFile: filePath => readFile(filePath, 'utf8'),
}

function projectIdentity(project: ProjectRecord) {
  return { id: project._id, slug: project.slug }
}

function isReceipt(value: unknown): value is PiTaskReceipt {
  if (!value || typeof value !== 'object') return false
  const receipt = value as Partial<PiTaskReceipt>
  return (
    typeof receipt.taskId === 'string' &&
    typeof receipt.parentSessionId === 'string' &&
    typeof receipt.parentAgent === 'string' &&
    typeof receipt.childAgent === 'string' &&
    typeof receipt.promptHash === 'string' &&
    typeof receipt.outputHash === 'string' &&
    typeof receipt.exitCode === 'number' &&
    typeof receipt.timeoutMs === 'number' &&
    typeof receipt.startedAt === 'string' &&
    typeof receipt.completedAt === 'string' &&
    typeof receipt.cwd === 'string'
  )
}

function sanitizeReceipt(receipt: PiTaskReceipt): SanitizedPiReceipt {
  return {
    taskId: receipt.taskId,
    parentSessionId: receipt.parentSessionId,
    parentAgent: receipt.parentAgent,
    childAgent: receipt.childAgent,
    ...(receipt.model ? { model: receipt.model } : {}),
    promptHash: receipt.promptHash,
    outputHash: receipt.outputHash,
    ...(receipt.startHead ? { startHead: receipt.startHead } : {}),
    ...(receipt.endHead ? { endHead: receipt.endHead } : {}),
    exitCode: receipt.exitCode,
    timeoutMs: receipt.timeoutMs,
    ...(receipt.maxTokens !== undefined ? { maxTokens: receipt.maxTokens } : {}),
    startedAt: receipt.startedAt,
    completedAt: receipt.completedAt,
  }
}

async function findReceipts(
  taskKey: string,
  projectPath: string,
  workRun: WorkRun,
  dependencies: Required<EvidenceRouteDependencies>,
): Promise<SanitizedPiReceipt[]> {
  const directory = dependencies.receiptDirectory()
  const projectCwd = resolve(projectPath)
  const receiptWindowEnd = workRun.finishedAt
  if (receiptWindowEnd === undefined) return []
  const files = await dependencies.listReceiptFiles(directory)
  const matches: Array<{ receipt: PiTaskReceipt; filePath: string }> = []

  for (const filePath of files) {
    // The production listing only returns direct JSON files. Keep this check
    // even for injected readers so a test seam cannot accidentally widen the
    // route to arbitrary paths.
    const relativeFilePath = relative(resolve(directory), resolve(filePath))
    if (!relativeFilePath || relativeFilePath.startsWith('..') || isAbsolute(relativeFilePath)) {
      continue
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(await dependencies.readReceiptFile(filePath))
    } catch {
      continue
    }
    if (!isReceipt(parsed)) continue
    if (parsed.parentSessionId !== taskKey) continue
    if (resolve(parsed.cwd) !== projectCwd) continue
    const receiptStartedAt = Date.parse(parsed.startedAt)
    const receiptCompletedAt = Date.parse(parsed.completedAt)
    if (!Number.isFinite(receiptStartedAt) || !Number.isFinite(receiptCompletedAt)) continue
    if (receiptStartedAt < workRun.startedAt || receiptCompletedAt < receiptStartedAt) continue
    if (receiptCompletedAt > receiptWindowEnd + 60_000) continue
    matches.push({ receipt: parsed, filePath })
  }

  return matches
    .sort((left, right) => left.receipt.startedAt.localeCompare(right.receipt.startedAt))
    .map(match => sanitizeReceipt(match.receipt))
}

/**
 * Registers production evidence reads for project work runs and Pi receipts.
 * @param router - Bun router receiving the read-only routes
 * @param client - Convex client used for canonical project and work-run reads
 * @param dependencies - Optional filesystem seams for deterministic tests
 */
export function registerEvidenceRoutes(
  router: Router,
  client: ConvexHttpClient,
  dependencies?: EvidenceRouteDependencies,
): void {
  const deps = { ...defaultDependencies, ...dependencies }

  router.get('/api/projects/:id/work-runs', async (_request, params) => {
    const project = await resolveProject(client, params.id)
    if (!project) return notFound()

    const workRuns = (await client.query(api.fleetCatalog.listWorkRunsByProject, {
      projectSlug: project.slug,
    })) as WorkRun[]
    return json({ project: projectIdentity(project), workRuns })
  })

  router.get('/api/projects/:id/pi-receipt', async (request, params) => {
    const searchParams = new URL(request.url).searchParams
    const taskKey = searchParams.get('taskKey')?.trim()
    const runId = searchParams.get('runId')?.trim()
    if (!taskKey) return badRequest('taskKey is required')
    if (!runId) return badRequest('runId is required')

    const project = await resolveProject(client, params.id)
    if (!project || !project.path) return notFound()

    try {
      const workRuns = (await client.query(api.fleetCatalog.listWorkRunsByProject, {
        projectSlug: project.slug,
      })) as WorkRun[]
      const workRun = workRuns.find(
        candidate =>
          candidate.runId === runId &&
          candidate.projectSlug === project.slug &&
          candidate.selectedTaskKey === taskKey,
      )
      if (!workRun) return notFound()

      const receipts = await findReceipts(taskKey, project.path, workRun, deps)
      if (receipts.length === 0) return notFound()
      return json({
        project: projectIdentity(project),
        taskKey,
        runId,
        receipts,
      })
    } catch {
      // Receipt storage is an optional local evidence source. Never expose
      // filesystem errors, paths, or partial receipt data to the browser.
      return notFound()
    }
  })
}
