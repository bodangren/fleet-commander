import { type Page } from '@playwright/test'
import { setupMockApp } from './mockApp'

type Scenario = 'empty' | 'demo' | 'kanban-cards'

interface SeedHandle {
  calls: ReturnType<typeof setupMockApp> extends Promise<infer T> ? T extends { calls: infer C } ? C : never : never
  assertNoRuntimeErrors(): Promise<void>
  /** Navigate and wait for the app shell to be interactive. */
  goto(path: string): Promise<void>
  seedId: string
  perPage: boolean
  projects: { list(): string[] }
  sprints: { list(): string[] }
  tasks: { list(): string[] }
  agents: { list(): string[] }
  settings: { get(): Record<string, unknown> }
}

function buildSeedId(scenario: Scenario, timestamp: number): string {
  return `seed-${scenario}-${timestamp}`
}

function buildCollections() {
  return {
    projects: { list: () => ['demo-project'] },
    sprints: { list: () => ['Sprint Alpha'] },
    tasks: { list: () => ['task-todo-1', 'task-blocked-1', 'task-done-1'] },
    agents: { list: () => ['architect', 'backend', 'frontend', 'qa'] },
    settings: { get: () => ({ defaultAgent: 'architect', orchestratorInterval: 30 }) },
  }
}

export async function seedScenario(page: Page, scenario: Scenario): Promise<SeedHandle> {
  const opts = scenario === 'empty' ? { emptyProjects: true } : {}
  const app = await setupMockApp(page, opts)
  const seedId = buildSeedId(scenario, Date.now())

  return {
    calls: app.calls,
    assertNoRuntimeErrors: app.assertNoRuntimeErrors,
    async goto(path: string) {
      await page.goto(path)
      // Shell marker used across e2e specs; fall back to network idle if absent.
      const ready = page.locator('[data-realtime-ready="true"]')
      if ((await ready.count()) > 0) {
        await ready.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
      } else {
        await page.waitForLoadState('domcontentloaded')
      }
    },
    seedId,
    perPage: true,
    ...buildCollections(),
  }
}
