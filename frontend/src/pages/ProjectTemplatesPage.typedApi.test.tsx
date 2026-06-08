/**
 * Phase 3 Red: Typed Convex API Boundary — ProjectTemplatesPage migration gate.
 *
 * Per `measure/tracks/typed_convex_boundary_20260605/plan.md` Phase 3 and the
 * `inventory.md` frontend section, the two call sites in ProjectTemplatesPage
 * that must be migrated from string-based casts to the typed `api.*` path are:
 *
 *   - `ProjectTemplatesPage.tsx:35` → `seedDefaultProjectTemplatesHandler`
 *   - `ProjectTemplatesPage.tsx:43` → `instantiateProjectHandler`
 *
 * The migration contract: `convexClient.mutation(<FunctionReference>, args)`
 * — the first argument is a `FunctionReference` proxy (not a string with
 * `as any`). Convex's `anyApi` proxy carries the qualified function name on
 * the well-known `Symbol.for('functionName')` symbol; the runtime check
 * below discriminates a string (current, wrong) from a `FunctionReference`
 * (target, typed).
 *
 * These tests are written first (Red phase) and MUST fail at HEAD because
 * `convexClient.mutation` is currently invoked with a string literal
 * (and an `as any` cast for both sites).
 *
 * Spec: measure/tracks/typed_convex_boundary_20260605/spec.md
 * Test strategy: measure/tracks/typed_convex_boundary_20260605/test-strategy.md
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  ],
  defaultAgents: [
    { role: 'architect', model: 'claude-opus', skills: ['system-design'], costPerPoint: 4.2 },
  ],
  estimatedBudget: 47.25,
  createdAt: 1000,
  updatedAt: 1000,
}

const FN_NAME = Symbol.for('functionName')

function getMutationArg(callIndex = 0): unknown {
  return mockConvexClient.mutation.mock.calls[callIndex]?.[0]
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

describe('Phase 3 — typed Convex API: ProjectTemplatesPage migration gate', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
    mockConvexClient.mutation.mockReset()
  })

  it('clicking "Seed Defaults" passes a FunctionReference (not a string) to convexClient.mutation', async () => {
    mockUseConvexQuery.mockReturnValue([])
    mockConvexClient.mutation.mockResolvedValue([])

    renderGallery()

    const seedButton = screen.getByRole('button', { name: /seed defaults/i })
    fireEvent.click(seedButton)

    await waitFor(() => {
      expect(mockConvexClient.mutation).toHaveBeenCalled()
    })

    const arg = getMutationArg()
    expect(typeof arg).not.toBe('string')
  })

  it('clicking "Seed Defaults" passes api.projectTemplates.seedDefaultProjectTemplatesHandler (Symbol.for("functionName") === "projectTemplates:seedDefaultProjectTemplatesHandler")', async () => {
    mockUseConvexQuery.mockReturnValue([])
    mockConvexClient.mutation.mockResolvedValue([])

    renderGallery()
    fireEvent.click(screen.getByRole('button', { name: /seed defaults/i }))

    await waitFor(() => {
      expect(mockConvexClient.mutation).toHaveBeenCalled()
    })

    const arg = getMutationArg() as Record<symbol, unknown>
    const name = arg[FN_NAME]
    expect(name).toBe('projectTemplates:seedDefaultProjectTemplatesHandler')
  })

  it('clicking detail modal "Create" passes a FunctionReference (not a string) to convexClient.mutation', async () => {
    mockUseConvexQuery.mockReturnValue([sampleTemplate])
    mockConvexClient.mutation.mockResolvedValue({
      projectId: 'projects-1',
      taskIds: ['tasks-1'],
    })

    renderGallery()
    fireEvent.click(screen.getByText('Web App (Next.js)'))

    const createButton = await screen.findByRole('button', { name: /^create$/i })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockConvexClient.mutation).toHaveBeenCalled()
    })

    const arg = getMutationArg()
    expect(typeof arg).not.toBe('string')
  })

  it('clicking detail modal "Create" passes api.projectTemplates.instantiateProjectHandler (Symbol.for("functionName") === "projectTemplates:instantiateProjectHandler")', async () => {
    mockUseConvexQuery.mockReturnValue([sampleTemplate])
    mockConvexClient.mutation.mockResolvedValue({
      projectId: 'projects-1',
      taskIds: ['tasks-1'],
    })

    renderGallery()
    fireEvent.click(screen.getByText('Web App (Next.js)'))
    const createButton = await screen.findByRole('button', { name: /^create$/i })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockConvexClient.mutation).toHaveBeenCalled()
    })

    const arg = getMutationArg() as Record<symbol, unknown>
    const name = arg[FN_NAME]
    expect(name).toBe('projectTemplates:instantiateProjectHandler')
  })
})
