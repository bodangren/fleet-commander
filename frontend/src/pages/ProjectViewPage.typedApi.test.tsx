/**
 * Typed Convex API boundary for ProjectViewPage's Save as Template flow.
 *
 * The page must call the shared client with
 * `api.projectTemplates.createProjectTemplateHandler`, not a string function
 * name. Convex FunctionReferences expose their qualified name through
 * `Symbol.for('functionName')`, which the tests below verify.
 *
 * Spec: measure/tracks/typed_convex_boundary_20260605/spec.md
 * Test strategy: measure/tracks/typed_convex_boundary_20260605/test-strategy.md
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import type { UseProjectLoaderReturn } from '@/hooks/useProjectView'
import type { ProjectDetail } from '@/lib/fleetTypes'

const mockConvexClient = {
  mutation: vi.fn(),
  query: vi.fn(),
}

vi.mock('@/lib/convex', () => ({
  get convexClient() {
    return mockConvexClient
  },
  isConvexConfigured: () => true,
}))

const mockUseProjectLoader = vi.fn()

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

import { ProjectViewPage } from '@/pages/ProjectViewPage'

const sampleProject = {
  id: 'demo-project',
  name: 'Demo Project',
  path: '/tmp/demo-project',
  tracks: [
    {
      id: 'track-setup',
      name: 'Setup',
      type: 'feature',
      description: 'Initial project setup',
      status: 'active',
      planPath: './measure/tracks/setup/plan.md',
      phases: [
        {
          name: 'Backlog',
          taskCount: 1,
          doneCount: 0,
          tasks: [
            {
              id: 'task-setup',
              description: 'Set up Next.js project',
              status: 'backlog',
              phase: 'Backlog',
            },
          ],
        },
      ],
    },
    {
      id: 'track-verification',
      name: 'Verification',
      type: 'chore',
      description: 'Verify project setup',
      status: 'active',
      planPath: './measure/tracks/verification/plan.md',
      phases: [
        {
          name: 'Acceptance',
          taskCount: 1,
          doneCount: 1,
          tasks: [
            {
              id: 'task-verification',
              description: 'Verify the initial project setup',
              status: 'done',
              phase: 'Acceptance',
            },
          ],
        },
      ],
    },
  ],
  lastUpdated: 1712000000,
} satisfies ProjectDetail

const FN_NAME = Symbol.for('functionName')

function createProjectLoaderState(): UseProjectLoaderReturn {
  return {
    project: sampleProject,
    loading: false,
    error: null,
    setProject: vi.fn(),
    reloadProject: vi.fn().mockResolvedValue(true),
  }
}

function getMutationArg(callIndex = 0): unknown {
  return mockConvexClient.mutation.mock.calls[callIndex]?.[0]
}

function renderProjectView() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={['/project/demo-project']}
    >
      <Routes>
        <Route path="/project/:id" element={<ProjectViewPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Phase 3 — typed Convex API: ProjectViewPage "Save as Template" migration gate', () => {
  beforeEach(() => {
    mockUseProjectLoader.mockReset()
    mockConvexClient.mutation.mockReset()
    mockUseProjectLoader.mockReturnValue(createProjectLoaderState())
    mockConvexClient.mutation.mockResolvedValue('projectTemplates-new-1')
  })

  it('submitting SaveAsTemplateModal passes a FunctionReference (not a string) to convexClient.mutation', async () => {
    const user = userEvent.setup()
    renderProjectView()

    const trigger = screen.queryByRole('button', { name: /save.*as.*template/i })
    if (!trigger) throw new Error('No "Save as Template" affordance on project view')
    await user.click(trigger)

    const saveButton = await screen.findByRole('button', { name: /^save$/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockConvexClient.mutation).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /save.*as.*template/i })).not.toBeInTheDocument()
    })

    const arg = getMutationArg()
    expect(typeof arg).not.toBe('string')
  })

  it('submitting SaveAsTemplateModal passes api.projectTemplates.createProjectTemplateHandler (Symbol.for("functionName") === "projectTemplates:createProjectTemplateHandler")', async () => {
    const user = userEvent.setup()
    renderProjectView()

    const trigger = screen.queryByRole('button', { name: /save.*as.*template/i })
    if (!trigger) throw new Error('No "Save as Template" affordance on project view')
    await user.click(trigger)

    const saveButton = await screen.findByRole('button', { name: /^save$/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockConvexClient.mutation).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /save.*as.*template/i })).not.toBeInTheDocument()
    })

    const arg = getMutationArg() as Record<symbol, unknown>
    const name = arg[FN_NAME]
    expect(name).toBe('projectTemplates:createProjectTemplateHandler')
  })
})
