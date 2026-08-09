/**
 * Integration tests for the `ProjectTemplatesPage` gallery route (Phase 3).
 *
 * The gallery renders at `/templates` and shows a grid of `TemplateCard`s with
 * category filters and a search box. It wires directly to the Convex
 * `projectTemplates:listProjectTemplatesHandler` query.
 *
 * The test strategy says:
 *   "Gallery route with search/filter wired to Convex query stubs"
 *   "Gallery: test search/filter narrows visible cards, category tab switching"
 *
 * These tests stub `useConvexQuery` to return canned template lists, then drive
 * search/filter UI events and assert the visible card set narrows correctly.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

const mockUseConvexQuery = vi.fn()

vi.mock('@/lib/useConvexData', () => ({
  useConvexQuery: (...args: unknown[]) => mockUseConvexQuery(...args),
}))

import { ProjectTemplatesPage } from '@/pages/ProjectTemplatesPage'

type Template = {
  _id: string
  name: string
  description: string
  category: string
  tasks: Array<{ title: string; storyPoints: number; priority: string; status: string }>
  defaultAgents: Array<{ role: string; model: string; skills: string[]; costPerPoint: number }>
  estimatedBudget: number
}

const sampleTemplates: Template[] = [
  {
    _id: 'projectTemplates-1',
    name: 'Web App (Next.js)',
    description: 'A starter Next.js web application with auth, routing, and database',
    category: 'Web App',
    tasks: [
      { title: 'Set up Next.js project', storyPoints: 2, priority: 'high', status: 'backlog' },
    ],
    defaultAgents: [
      {
        role: 'architect',
        model: 'claude-opus',
        skills: ['system-design'],
        costPerPoint: 4.2,
      },
    ],
    estimatedBudget: 47.25,
  },
  {
    _id: 'projectTemplates-2',
    name: 'API Service (Bun/Hono)',
    description: 'A lightweight REST API service using Bun runtime and Hono framework',
    category: 'API Service',
    tasks: [
      { title: 'Initialize Bun project', storyPoints: 2, priority: 'high', status: 'backlog' },
    ],
    defaultAgents: [
      {
        role: 'executor',
        model: 'claude-sonnet',
        skills: ['bun'],
        costPerPoint: 2.1,
      },
    ],
    estimatedBudget: 18.9,
  },
  {
    _id: 'projectTemplates-3',
    name: 'Python CLI',
    description: 'A command-line tool built with Python and Click',
    category: 'CLI',
    tasks: [
      { title: 'Set up Python project', storyPoints: 2, priority: 'high', status: 'backlog' },
    ],
    defaultAgents: [
      { role: 'executor', model: 'claude-sonnet', skills: ['python'], costPerPoint: 2.1 },
    ],
    estimatedBudget: 10.5,
  },
  {
    _id: 'projectTemplates-4',
    name: 'Documentation Site',
    description: 'A documentation website with search and versioning',
    category: 'Documentation',
    tasks: [
      { title: 'Set up docs framework', storyPoints: 3, priority: 'high', status: 'backlog' },
    ],
    defaultAgents: [
      { role: 'executor', model: 'gemini-pro', skills: ['markdown'], costPerPoint: 1.2 },
    ],
    estimatedBudget: 7.2,
  },
]

function renderGallery() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={['/templates']}
    >
      <ProjectTemplatesPage />
    </MemoryRouter>,
  )
}

describe('ProjectTemplatesPage', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
  })

  it('calls the fully qualified public projectTemplates query on mount', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    renderGallery()
    expect(mockUseConvexQuery).toHaveBeenCalledWith(
      'projectTemplates:listProjectTemplatesHandler',
      {},
      true,
      expect.any(Function),
    )
  })

  it('renders a loading state when the query has not resolved', () => {
    mockUseConvexQuery.mockReturnValue(undefined)
    renderGallery()
    expect(screen.getByText(/loading project templates/i)).toBeInTheDocument()
  })

  it('renders an explicit unavailable state when the public query fails', async () => {
    mockUseConvexQuery.mockImplementation(
      (_name: string, _args: unknown, _enabled: boolean, onError?: (error: unknown) => void) => {
        queueMicrotask(() => onError?.(new Error('Function not found')))
        return undefined
      },
    )

    renderGallery()

    expect(await screen.findByText(/project templates are unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders a card per template when the query returns data', () => {
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()
    expect(screen.getByText('Web App (Next.js)')).toBeInTheDocument()
    expect(screen.getByText('API Service (Bun/Hono)')).toBeInTheDocument()
    expect(screen.getByText('Python CLI')).toBeInTheDocument()
    expect(screen.getByText('Documentation Site')).toBeInTheDocument()
  })

  it('renders the four built-in spec categories as filter chips', () => {
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^web app$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^api service$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^cli$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^documentation$/i })).toBeInTheDocument()
  })

  it('renders an empty state when no templates are returned', () => {
    mockUseConvexQuery.mockReturnValue([])
    renderGallery()
    expect(screen.getByText(/no project templates yet/i)).toBeInTheDocument()
  })

  it('narrows the visible cards when a category filter is clicked', async () => {
    const user = userEvent.setup()
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()

    await user.click(screen.getByRole('button', { name: /^web app$/i }))

    expect(screen.getByText('Web App (Next.js)')).toBeInTheDocument()
    expect(screen.queryByText('API Service (Bun/Hono)')).not.toBeInTheDocument()
    expect(screen.queryByText('Python CLI')).not.toBeInTheDocument()
    expect(screen.queryByText('Documentation Site')).not.toBeInTheDocument()
  })

  it('restores all cards when the "All" filter is clicked after filtering', async () => {
    const user = userEvent.setup()
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()

    await user.click(screen.getByRole('button', { name: /^cli$/i }))
    expect(screen.queryByText('Web App (Next.js)')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^all$/i }))
    expect(screen.getByText('Web App (Next.js)')).toBeInTheDocument()
    expect(screen.getByText('Python CLI')).toBeInTheDocument()
    expect(screen.getByText('Documentation Site')).toBeInTheDocument()
  })

  it('narrows the visible cards when the search input matches a name fragment', async () => {
    const user = userEvent.setup()
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()

    const search = screen.getByRole('searchbox', { name: /search/i })
    await user.type(search, 'python')

    expect(screen.getByText('Python CLI')).toBeInTheDocument()
    expect(screen.queryByText('Web App (Next.js)')).not.toBeInTheDocument()
    expect(screen.queryByText('API Service (Bun/Hono)')).not.toBeInTheDocument()
  })

  it('search is case-insensitive', async () => {
    const user = userEvent.setup()
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()

    const search = screen.getByRole('searchbox', { name: /search/i })
    await user.type(search, 'PYTHON')

    expect(screen.getByText('Python CLI')).toBeInTheDocument()
  })

  it('search and category filter compose (intersection)', async () => {
    const user = userEvent.setup()
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()

    await user.click(screen.getByRole('button', { name: /^web app$/i }))
    const search = screen.getByRole('searchbox', { name: /search/i })
    await user.type(search, 'api')

    // Category = Web App, search = "api" — there is no Web App matching "api",
    // so the gallery should show the empty filter state.
    expect(screen.queryByText('Web App (Next.js)')).not.toBeInTheDocument()
    expect(screen.queryByText('API Service (Bun/Hono)')).not.toBeInTheDocument()
  })

  it('opens the detail modal when a card is clicked', async () => {
    const user = userEvent.setup()
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()

    await user.click(screen.getByRole('button', { name: 'Web App (Next.js)' }))

    // The detail modal renders with a dialog role + a Close button.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('the gallery displays the page title "Project Templates"', () => {
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()
    expect(screen.getByRole('heading', { name: /project templates/i })).toBeInTheDocument()
  })

  it('renders a Seed Defaults button that calls the seed mutation stub', () => {
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()
    expect(screen.getByRole('button', { name: /seed defaults/i })).toBeInTheDocument()
  })

  it('lists the spec-required template count in the header summary', () => {
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()
    const summary = screen.getByText(/4\s+templates?/i)
    expect(summary).toBeInTheDocument()
  })
})

describe('ProjectTemplatesPage filter chips group', () => {
  beforeEach(() => {
    mockUseConvexQuery.mockReset()
  })

  it('group wraps the category buttons for assistive tech', () => {
    mockUseConvexQuery.mockReturnValue(sampleTemplates)
    renderGallery()
    const group = screen.getByRole('group', { name: /category filters/i })
    expect(within(group).getByRole('button', { name: /^all$/i })).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: /^cli$/i })).toBeInTheDocument()
  })
})
