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
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

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
  tracks: [],
  lastUpdated: 1712000000,
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

describe('Phase 4 — verification: "Save as Template" integration on project surface', () => {
  beforeEach(() => {
    mockUseProjectLoader.mockReset()
    mockCreateProjectTemplate.mockReset()
    // Default: the project loader returns a minimal project.
    mockUseProjectLoader.mockReturnValue({
      project: sampleProject,
      loading: false,
      error: null,
      setProject: vi.fn(),
    })
  })

  it('exposes a "Save as Template" action somewhere in the project view (button, menu, or settings tab)', () => {
    renderProjectView()

    // The contract: a user-facing affordance to derive a template from the
    // current project. Either a direct "Save as Template" button OR a
    // settings tab that contains it.
    const directButton = screen.queryByRole('button', { name: /save.*as.*template/i })
    const settingsTab = screen.queryByRole('button', { name: /^(settings|template)$/i })

    expect(directButton !== null || settingsTab !== null).toBe(true)
  })

  it('clicking the "Save as Template" action opens SaveAsTemplateModal with the current project as the source', async () => {
    renderProjectView()

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

    fireEvent.click(trigger)

    // The SaveAsTemplateModal exposes a unique heading "Save as Template"
    // and pre-fills the template-name input from the source project name.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /save.*as.*template/i })).toBeInTheDocument()
    })
    const nameInput = await screen.findByRole('textbox', { name: /template name/i })
    expect((nameInput as HTMLInputElement).value).toBe('Demo Project')
  })

  it('submitting the modal invokes the createProjectTemplate mutation with the stripped template payload', async () => {
    mockCreateProjectTemplate.mockResolvedValue('projectTemplates-new-1')

    renderProjectView()

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
    fireEvent.click(trigger)

    // The modal must render the Save button. The modal pre-fills the
    // template name from the project, so we can submit without further input.
    const saveButton = await screen.findByRole('button', { name: /^save$/i })
    fireEvent.click(saveButton)

    // The page must invoke the `createProjectTemplate` mutation exactly once
    // with a payload that conforms to the spec contract.
    await waitFor(() => {
      expect(mockCreateProjectTemplate).toHaveBeenCalledTimes(1)
    })
    const [fnRef, args] = mockCreateProjectTemplate.mock.calls[0] ?? []
    const fnName = (fnRef as Record<symbol, string | undefined>)[Symbol.for('functionName')]
    expect(fnName).toMatch(/createProjectTemplate/i)

    // Required payload fields (per spec AC and SaveAsTemplatePayload type).
    expect(args).toMatchObject({
      name: 'Demo Project',
    })
    expect(args).toHaveProperty('description')
    expect(args).toHaveProperty('category')
    expect(args).toHaveProperty('tasks')
    expect(args).toHaveProperty('defaultAgents')
    expect(args).toHaveProperty('estimatedBudget')
    expect(typeof (args as { estimatedBudget: unknown }).estimatedBudget).toBe('number')

    // PII-stripping contract: tasks in the payload must not leak runtime
    // fields (description, assigneeId, sessionId, actualCost, etc.). The
    // strict stripping is unit-tested in SaveAsTemplateModal.test.tsx; here
    // we assert the integration passes a payload whose tasks are
    // structure-only.
    const tasks = (args as { tasks: Array<Record<string, unknown>> }).tasks
    expect(Array.isArray(tasks)).toBe(true)
    for (const t of tasks) {
      expect(t).not.toHaveProperty('description')
      expect(t).not.toHaveProperty('assigneeId')
      expect(t).not.toHaveProperty('sessionId')
      expect(t).not.toHaveProperty('actualCost')
      expect(t).not.toHaveProperty('reviewerId')
      expect(t).not.toHaveProperty('mergerId')
    }
  })
})
