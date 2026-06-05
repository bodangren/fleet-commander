/**
 * Phase 4 verification tests for ProjectTemplatesPage wiring.
 *
 * The Phase 4 plan includes a manual test for "creating a project from the
 * Web App template, tasks appear in backlog". The end-to-end flow depends on
 * the gallery page wiring its action callbacks to the underlying Convex
 * mutations:
 *
 *   - Clicking a template card → opening the detail modal → clicking "Create"
 *     must invoke `instantiateProjectHandler` (or surface the args to the
 *     caller). Today the gallery passes `onCreate={() => {}}` — a no-op stub.
 *   - Clicking "Seed Defaults" must invoke
 *     `seedDefaultProjectTemplatesHandler`. Today the button has no onClick.
 *
 * These tests are written first (Red phase). They will fail until the
 * gallery page wires those callbacks to the Convex mutations. Once wired,
 * the tests assert the correct mutation name and args.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockUseConvexQuery = vi.fn()
const mockConvexClient = {
  mutation: vi.fn(),
  query: vi.fn(),
}

vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: (...args: unknown[]) => mockUseConvexQuery(...args),
}))

vi.mock('@/lib/convex', () => ({
  get convexClient() {
    return mockConvexClient
  },
  isConvexConfigured: () => true,
}))

import { ProjectTemplatesPage } from '@/pages/ProjectTemplatesPage'

const sampleTemplate = {
  _id: 'projectTemplates-1',
  name: 'Web App (Next.js)',
  description: 'A starter Next.js web application with auth, routing, and database',
  category: 'Web App',
  tasks: [
    { title: 'Set up Next.js project', storyPoints: 2, priority: 'high', status: 'backlog' },
    {
      title: 'Configure database',
      storyPoints: 5,
      priority: 'high',
      status: 'backlog',
      dependencies: ['Set up Next.js project'],
    },
    {
      title: 'Add authentication',
      storyPoints: 8,
      priority: 'medium',
      status: 'backlog',
      dependencies: ['Configure database'],
    },
  ],
  defaultAgents: [
    { role: 'architect', model: 'claude-opus', skills: ['system-design'], costPerPoint: 4.2 },
  ],
  estimatedBudget: 47.25,
  createdAt: 1000,
  updatedAt: 1000,
}

function renderGallery(initialPath = '/templates') {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[initialPath]}
    >
      <ProjectTemplatesPage />
    </MemoryRouter>,
  )
}

describe('Phase 4 — verification: ProjectTemplatesPage wiring', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
    mockConvexClient.mutation.mockReset()
  })

  it('clicking the detail modal "Create" button invokes the instantiateProjectHandler mutation with the template id', async () => {
    mockUseConvexQuery.mockReturnValue([sampleTemplate])
    mockConvexClient.mutation.mockResolvedValue({
      projectId: 'projects-1',
      taskIds: ['tasks-1', 'tasks-2', 'tasks-3'],
    })

    renderGallery()

    // Open the detail modal by clicking the template card
    fireEvent.click(screen.getByText('Web App (Next.js)'))

    // The detail modal renders a "Create" button
    const createButton = await screen.findByRole('button', { name: /^create$/i })
    fireEvent.click(createButton)

    // The mutation must be invoked with the template id.
    expect(mockConvexClient.mutation).toHaveBeenCalled()
    const [mutationName, args] = mockConvexClient.mutation.mock.calls[0] ?? []
    expect(mutationName).toMatch(/instantiateProject/i)
    expect(args).toMatchObject({ templateId: 'projectTemplates-1' })
  })

  it('clicking the "Seed Defaults" button invokes the seedDefaultProjectTemplatesHandler mutation', async () => {
    mockUseConvexQuery.mockReturnValue([])
    mockConvexClient.mutation.mockResolvedValue([
      'projectTemplates-1',
      'projectTemplates-2',
      'projectTemplates-3',
      'projectTemplates-4',
    ])

    renderGallery()

    const seedButton = screen.getByRole('button', { name: /seed defaults/i })
    fireEvent.click(seedButton)

    expect(mockConvexClient.mutation).toHaveBeenCalled()
    const mutationName = mockConvexClient.mutation.mock.calls[0]?.[0]
    expect(mutationName).toMatch(/seedDefaultProjectTemplates/i)
  })

  it('renders the detail modal Create button disabled while creating (a11y: prevents double-submit)', async () => {
    mockUseConvexQuery.mockReturnValue([sampleTemplate])
    // Hold the mutation in flight
    mockConvexClient.mutation.mockReturnValue(new Promise(() => {}))

    renderGallery()
    fireEvent.click(screen.getByText('Web App (Next.js)'))

    const createButton = await screen.findByRole('button', { name: /^create$/i })
    fireEvent.click(createButton)

    // After click, the same button must be disabled
    const buttons = screen.getAllByRole('button', { name: /create/i })
    const stillCreate = buttons.find(b => !b.textContent?.toLowerCase().includes('creating'))
    if (stillCreate) {
      expect(stillCreate).toBeDisabled()
    }
  })
})
