import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { HarnessCard } from '@/components/HarnessCard'
import type { HarnessRecord } from '@/lib/fleetTypes'

describe('HarnessCard', () => {
  it('renders harness details and triggers discovery callback', () => {
    const onTestDiscovery = vi.fn()
    const harness: HarnessRecord = {
      layer: 'user',
      binaryFound: true,
      definition: {
        name: 'Mock Harness',
        binary: 'mock-harness',
        discovery: {
          command: 'mock-harness',
          parseStrategy: 'line-per-model',
          pattern: '',
        },
        invocation: {
          template: 'mock-harness --model {model} --prompt {prompt}',
          flags: {},
        },
      },
    }

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HarnessCard harness={harness} busy={false} onTestDiscovery={onTestDiscovery} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Mock Harness')).toBeInTheDocument()
    expect(screen.getByText('available')).toBeInTheDocument()
    expect(screen.getByText('line-per-model')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Test Discovery' }))
    expect(onTestDiscovery).toHaveBeenCalledTimes(1)
  })
})
