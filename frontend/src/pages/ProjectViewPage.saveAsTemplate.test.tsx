/**
 * Phase 4 verification tests for the "Save as Template" action on the project
 * settings surface.
 *
 * The Phase 4 plan includes a manual test for "save existing project as
 * template, content stripped". The contract from the test strategy says:
 *
 *   "'Save as Template' flow: mock mutation, verify content stripping matches
 *    extractTemplateFromProject output."
 *
 * The `SaveAsTemplateModal` component (and its unit tests) already validate
 * the strip-and-payload contract. The Phase 4 manual test is about the
 * end-to-end *integration*: the user must be able to open the modal from the
 * project surface, the modal must be populated with the current project as
 * the source, and submitting the modal must invoke the `createProjectTemplate`
 * mutation with a payload that matches the spec contract (no PII, structure
 * preserved, recommended budget present).
 *
 * These tests are written first (Red phase) — they will fail until the
 * project view (or a project settings page) exposes a "Save as Template"
 * action that opens the `SaveAsTemplateModal` and wires its submit to the
 * `createProjectTemplate` Convex mutation.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import type { SaveAsTemplatePayload, SaveAsTemplateSource } from '@/components/SaveAsTemplateModal'
import type { UseProjectLoaderReturn } from '@/hooks/useProjectView'
import type { ProjectDetail } from '@/lib/fleetTypes'

const mockUseProjectLoader = vi.fn()
const mockCreateProjectTemplate = vi.fn()

vi.mock('@/hooks/useProjectView', async () => {
  const actual = (await vi.importActual<unknown>('@/hooks/useProjectView')) as Record<
    string,
    unknown
  >
  return {
    ...actual,
    useProjectLoader: (id: string | undefined) => mockUseProjectLoader(id),
  }
})

vi.mock('@/lib/convex', () => ({
  get convexClient() {
    return { mutation: mockCreateProjectTemplate, query: vi.fn() }
  },
  isConvexConfigured: () => true,
}))

import { ProjectViewPage } from '@/pages/ProjectViewPage'

const sampleProject = {
  id: 'demo-project',
  name: 'Demo Project',
  path: '/tmp/demo-project',
  description: 'Reporting workspace for internal operations.',
  tracks: [
    {
      id: 'track-reporting',
      name: 'Reporting',
      type: 'feature',
      description: 'Deliver operational reporting.',
      status: 'active',
      planPath: './measure/tracks/reporting/plan.md',
      phases: [
        {
          name: 'Implementation',
          taskCount: 2,
          doneCount: 0,
          tasks: [
            {
              id: 'task-reporting-data-model',
              description: 'Design the reporting data model.',
              status: 'ready',
              agentTag: 'alice',
              phase: 'Implementation',
            },
            {
              id: 'task-reporting-dashboard',
              description: 'Build the reporting dashboard.',
              status: 'blocked',
              agentTag: 'bob',
              phase: 'Implementation',
            },
          ],
        },
      ],
    },
  ],
  agents: [
    {
      _id: 'agent-reporting-architect',
      name: 'alice',
      role: 'architect',
      model: 'claude-opus',
      skills: ['system-design', 'typescript'],
      costPerPoint: 4.2,
    },
    {
      _id: 'agent-reporting-executor',
      name: 'bob',
      role: 'executor',
      model: 'claude-sonnet',
      skills: ['typescript', 'react'],
      costPerPoint: 2.1,
    },
  ],
  lastUpdated: 1712000000,
} satisfies ProjectDetail & {
  description: string
  agents: SaveAsTemplateSource['agents']
}

function mockJsonResponse(payload: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function createProjectLoaderState(project: ProjectDetail = sampleProject): UseProjectLoaderReturn {
  return {
    project,
    loading: false,
    error: null,
    setProject: vi.fn(),
    reloadProject: vi.fn().mockResolvedValue(true),
  }
}

async function renderProjectView(fetchMock: ReturnType<typeof vi.fn>) {
  const view = render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={['/project/demo-project']}
    >
      <Routes>
        <Route path="/project/:id" element={<ProjectViewPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/demo-project/next-task')
  })
  expect(await screen.findByText('No tasks available')).toBeInTheDocument()
  expect(screen.queryByText('not found')).not.toBeInTheDocument()
  return view
}

describe('Phase 4 — verification: "Save as Template" integration on project surface', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUseProjectLoader.mockReset()
    mockCreateProjectTemplate.mockReset()
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/projects/demo-project/next-task')) {
        return Promise.resolve(mockJsonResponse({ error: 'not found' }, 404))
      }
      return Promise.resolve(mockJsonResponse({ error: `Unexpected request: ${url}` }, 404))
    })
    vi.stubGlobal('fetch', fetchMock)
    // Default: the project loader returns the complete hook contract.
    mockUseProjectLoader.mockReturnValue(createProjectLoaderState())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes a "Save as Template" action somewhere in the project view (button, menu, or settings tab)', async () => {
    await renderProjectView(fetchMock)

    // The contract: a user-facing affordance to derive a template from the
    // current project. Either a direct "Save as Template" button OR a
    // settings tab that contains it.
    const directButton = screen.queryByRole('button', { name: /save.*as.*template/i })
    const settingsTab = screen.queryByRole('button', { name: /^(settings|template)$/i })

    expect(directButton !== null || settingsTab !== null).toBe(true)
  })

  it('clicking the "Save as Template" action opens SaveAsTemplateModal with the current project as the source', async () => {
    const user = userEvent.setup()
    await renderProjectView(fetchMock)

    // Find the trigger. Whichever affordance exists.
    const trigger =
      screen.queryByRole('button', { name: /save.*as.*template/i }) ??
      screen.queryByRole('button', { name: /^(settings|template)$/i })
    if (!trigger) {
      throw new Error(
        'No "Save as Template" affordance found on the project view. ' +
          'This test (Red phase) captures the missing integration.',
      )
    }

    await user.click(trigger)

    // The SaveAsTemplateModal exposes a unique heading "Save as Template"
    // and pre-fills the template-name input from the source project name.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /save.*as.*template/i })).toBeInTheDocument()
    })
    const nameInput = await screen.findByRole('textbox', { name: /template name/i })
    expect((nameInput as HTMLInputElement).value).toBe('Demo Project')
  })

  it('does not expose an imported local path as the template description default or payload', async () => {
    const user = userEvent.setup()
    mockCreateProjectTemplate.mockResolvedValue('projectTemplates-new-1')
    mockUseProjectLoader.mockReturnValue(
      createProjectLoaderState({
        ...sampleProject,
        description: 'Imported from /home/daniebo/projects/customer-benchmark',
      }),
    )

    await renderProjectView(fetchMock)
    await user.click(screen.getByRole('button', { name: /save.*as.*template/i }))

    await expect(screen.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue('')

    await user.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(mockCreateProjectTemplate).toHaveBeenCalledTimes(1)
    })
    const [, args] = mockCreateProjectTemplate.mock.calls[0] ?? []
    expect(args).toMatchObject({ description: '' })
    expect(JSON.stringify(args)).not.toContain('/home/daniebo/')
  })

  it('preserves a benign project description while stripping the template payload', async () => {
    const user = userEvent.setup()
    mockCreateProjectTemplate.mockResolvedValue('projectTemplates-new-1')

    await renderProjectView(fetchMock)

    // Open the modal.
    const trigger =
      screen.queryByRole('button', { name: /save.*as.*template/i }) ??
      screen.queryByRole('button', { name: /^(settings|template)$/i })
    if (!trigger) {
      throw new Error(
        'No "Save as Template" affordance found on the project view. ' +
          'This test (Red phase) captures the missing integration.',
      )
    }
    await user.click(trigger)

    // The modal must render the Save button. The modal pre-fills the
    // template name from the project, so we can submit without further input.
    const saveButton = await screen.findByRole('button', { name: /^save$/i })
    await user.click(saveButton)

    // The page must invoke the `createProjectTemplate` mutation exactly once
    // with a payload that conforms to the spec contract.
    await waitFor(() => {
      expect(mockCreateProjectTemplate).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /save.*as.*template/i })).not.toBeInTheDocument()
    })
    const [fnRef, args] = mockCreateProjectTemplate.mock.calls[0] ?? []
    const fnName = (fnRef as Record<symbol, string | undefined>)[Symbol.for('functionName')]
    expect(fnName).toMatch(/createProjectTemplate/i)

    // The source contains runtime identifiers and agent names, but the saved
    // template must retain only reusable work structure and anonymized agent
    // defaults. Budget uses total story points × average agent cost per point.
    expect(args).toEqual({
      name: 'Demo Project',
      description: 'Reporting workspace for internal operations.',
      category: 'Web App',
      tasks: [
        {
          title: 'Design the reporting data model.',
          storyPoints: 1,
          priority: 'medium',
          status: 'ready',
        },
        {
          title: 'Build the reporting dashboard.',
          storyPoints: 1,
          priority: 'medium',
          status: 'blocked',
        },
      ],
      defaultAgents: [
        {
          role: 'architect',
          model: 'claude-opus',
          skills: ['system-design', 'typescript'],
          costPerPoint: 4.2,
        },
        {
          role: 'executor',
          model: 'claude-sonnet',
          skills: ['typescript', 'react'],
          costPerPoint: 2.1,
        },
      ],
      estimatedBudget: 6.3,
    })

    // Keep this assertion type-checked even as the Convex payload evolves.
    const typedPayload: SaveAsTemplatePayload = args as SaveAsTemplatePayload
    expect(typedPayload.estimatedBudget).toBe(6.3)
  })
})
