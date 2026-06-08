/**
 * Phase 3 Red: Typed Convex API Boundary — ProjectViewPage "Save as Template"
 * migration gate.
 *
 * Per `measure/tracks/typed_convex_boundary_20260605/plan.md` Phase 3 and the
 * `inventory.md` frontend section, the call site in ProjectViewPage that must
 * be migrated from a string-based call to the typed `api.*` path is:
 *
 *   - `ProjectViewPage.tsx:93` → `createProjectTemplate` (the underlying
 *     Convex function is `api.projectTemplates.createProjectTemplateHandler`).
 *
 * Today the page creates its own `ConvexClient('')`, casts it structurally to
 * `{ mutation: (name: string, args: unknown) => Promise<unknown> }`, and calls
 * `.mutation('createProjectTemplate', payload)`. Phase 3 migrates it to use
 * the shared `convexClient` and the typed
 * `api.projectTemplates.createProjectTemplateHandler` FunctionReference.
 *
 * The migration contract: `convexClient.mutation(<FunctionReference>, args)`
 * — the first argument is a `FunctionReference` proxy (not a string).
 * Convex's `anyApi` proxy carries the qualified function name on the
 * well-known `Symbol.for('functionName')` symbol; the runtime check below
 * discriminates a string (current, wrong) from a `FunctionReference` (target,
 * typed).
 *
 * This test is written first (Red phase) and MUST fail at HEAD because the
 * current implementation does not even reach the shared `convexClient`
 * mutation: it instantiates a local `ConvexClient('')` and bypasses the
 * mocked client entirely, so the mock's call count is zero.
 *
 * Spec: measure/tracks/typed_convex_boundary_20260605/spec.md
 * Test strategy: measure/tracks/typed_convex_boundary_20260605/test-strategy.md
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

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
      phases: [
        {
          tasks: [
            {
              id: 't1',
              description: 'Set up Next.js project',
              status: 'backlog',
            },
          ],
        },
      ],
    },
  ],
  lastUpdated: 1712000000,
}

const FN_NAME = Symbol.for('functionName')

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
    mockUseProjectLoader.mockReturnValue({
      project: sampleProject,
      loading: false,
      error: null,
      setProject: vi.fn(),
    })
    mockConvexClient.mutation.mockResolvedValue('projectTemplates-new-1')
  })

  it('submitting SaveAsTemplateModal passes a FunctionReference (not a string) to convexClient.mutation', async () => {
    renderProjectView()

    const trigger = screen.queryByRole('button', { name: /save.*as.*template/i })
    if (!trigger) throw new Error('No "Save as Template" affordance on project view')
    fireEvent.click(trigger)

    const saveButton = await screen.findByRole('button', { name: /^save$/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockConvexClient.mutation).toHaveBeenCalled()
    })

    const arg = getMutationArg()
    expect(typeof arg).not.toBe('string')
  })

  it('submitting SaveAsTemplateModal passes api.projectTemplates.createProjectTemplateHandler (Symbol.for("functionName") === "projectTemplates:createProjectTemplateHandler")', async () => {
    renderProjectView()

    const trigger = screen.queryByRole('button', { name: /save.*as.*template/i })
    if (!trigger) throw new Error('No "Save as Template" affordance on project view')
    fireEvent.click(trigger)

    const saveButton = await screen.findByRole('button', { name: /^save$/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockConvexClient.mutation).toHaveBeenCalled()
    })

    const arg = getMutationArg() as Record<symbol, unknown>
    const name = arg[FN_NAME]
    expect(name).toBe('projectTemplates:createProjectTemplateHandler')
  })
})
