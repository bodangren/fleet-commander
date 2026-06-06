/**
 * Phase 5 Red gate — `useBlockerResolutionToast` hook.
 *
 * Wires `getNewlyUnblockedTasks` to the existing `useToast` provider so
 * that whenever a task completes, the user sees a one-line toast naming
 * each newly-unblocked downstream task. The hook does not exist yet
 * (Red gate: module resolution fails).
 *
 * See plan.md Phase 5 task 5 and test-strategy.md §3 item 8.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, renderHook } from '@testing-library/react'

import { useBlockerResolutionToast } from './useBlockerResolutionToast'
import { ToastProvider } from '@/lib/toast'
import type { Task } from '@/lib/kanban'

function withToast(node: React.ReactNode) {
  return render(<ToastProvider>{node}</ToastProvider>)
}

const baseTime = 1_700_000_000_000

function task(
  key: string,
  status: Task['status'],
  dependencies: string[] = [],
): Task {
  return {
    _id: `id-${key}`,
    title: `Task ${key}`,
    status,
    dependencies,
    projectId: 'p1',
    priority: 'medium',
    createdAt: baseTime,
    updatedAt: baseTime,
  }
}

describe('useBlockerResolutionToast (Phase 5 Red gate — module resolution)', () => {
  let showToast: ReturnType<typeof vi.fn>

  beforeEach(() => {
    showToast = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('imports without throwing (Red gate: module must exist)', () => {
    expect(useBlockerResolutionToast).toBeDefined()
  })

  it('does not show a toast when no task is completed', () => {
    renderHook(() => useBlockerResolutionToast({ tasks: [], showToast }))
    expect(showToast).not.toHaveBeenCalled()
  })

  it('shows a success toast naming the unblocked downstream task [Red gate]', () => {
    const tasks = [
      task('A', 'done'),
      task('B', 'blocked', ['A']),
    ]
    renderHook(() => useBlockerResolutionToast({ tasks, showToast }))
    // Look for a call that mentions TASK-B in the message.
    const bCall = showToast.mock.calls.find(args =>
      String(args[1] ?? '').includes('TASK-B'),
    )
    expect(bCall).toBeDefined()
    expect(bCall![0]).toBe('success')
  })

  it('does not show a toast for tasks that are still blocked after completion', () => {
    const tasks = [
      task('A', 'done'),
      task('B', 'in_progress'),
      task('C', 'blocked', ['A', 'B']),
    ]
    renderHook(() => useBlockerResolutionToast({ tasks, showToast }))
    const cCall = showToast.mock.calls.find(args =>
      String(args[1] ?? '').includes('TASK-C'),
    )
    expect(cCall).toBeUndefined()
  })

  it('shows one toast per newly-unblocked task in stable order [Red gate]', () => {
    const tasks = [
      task('A', 'done'),
      task('B', 'blocked', ['A']),
      task('C', 'blocked', ['A']),
      task('D', 'blocked', ['A']),
    ]
    renderHook(() => useBlockerResolutionToast({ tasks, showToast }))
    const successCalls = showToast.mock.calls.filter(args => args[0] === 'success')
    expect(successCalls.length).toBe(3)
    const messages = successCalls.map(args => String(args[1] ?? ''))
    expect(messages.find(m => m.includes('TASK-B'))).toBeDefined()
    expect(messages.find(m => m.includes('TASK-C'))).toBeDefined()
    expect(messages.find(m => m.includes('TASK-D'))).toBeDefined()
  })

  it('emits no toast when the completed-task list is empty', () => {
    const tasks = [task('A', 'ready'), task('B', 'ready')]
    renderHook(() => useBlockerResolutionToast({ tasks, showToast }))
    expect(showToast).not.toHaveBeenCalled()
  })
})

describe('useBlockerResolutionToast — integration with ToastProvider', () => {
  it('renders a toast bubble in the DOM when a task is unblocked [Red gate]', async () => {
    const tasks = [task('A', 'done'), task('B', 'blocked', ['A'])]
    function Harness() {
      useBlockerResolutionToast({ tasks })
      return <div data-testid="harness" />
    }
    await act(async () => {
      withToast(<Harness />)
    })
    // The toast text is rendered with the unblocked task key. The
    // exact wording is part of the contract; we expect TASK-B to be
    // mentioned somewhere on the page.
    expect(
      await screen.findByText(/TASK-B/, undefined, { timeout: 2000 }),
    ).toBeInTheDocument()
  })
})
