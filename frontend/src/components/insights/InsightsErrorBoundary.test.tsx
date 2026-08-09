import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { InsightsErrorBoundary } from './InsightsErrorBoundary'

function Thrower({ message }: { message: string }) {
  throw new Error(message)
}

describe('InsightsErrorBoundary', () => {
  it('renders fallback UI when a child component throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      render(
        <InsightsErrorBoundary fallback="Error loading insights">
          <Thrower message="Query failed" />
        </InsightsErrorBoundary>,
      )

      expect(screen.getByText('Error loading insights')).toBeInTheDocument()
      const expectedBoundaryMessages = [
        'The above error occurred in the <Thrower> component.',
        'React will try to recreate this component tree from scratch using the error boundary you provided, InsightsErrorBoundary.',
      ]
      const capturedArguments = consoleError.mock.calls.flat()
      const capturedErrors = capturedArguments.filter(
        (argument): argument is Error => argument instanceof Error,
      )
      const semanticMessages = capturedArguments.filter(
        (argument): argument is string => typeof argument === 'string' && !argument.includes('%'),
      )

      expect(capturedErrors).not.toHaveLength(0)
      for (const error of capturedErrors) {
        expect(error).toMatchObject({ name: 'Error', message: 'Query failed' })
      }
      expect(semanticMessages).toEqual(expect.arrayContaining(expectedBoundaryMessages))
      expect(semanticMessages.every(message => expectedBoundaryMessages.includes(message))).toBe(
        true,
      )

      for (const call of consoleError.mock.calls) {
        const containsExpectedError = call.some(
          argument =>
            argument instanceof Error &&
            argument.name === 'Error' &&
            argument.message === 'Query failed',
        )
        const containsExpectedBoundaryMessage = call.some(
          argument => typeof argument === 'string' && expectedBoundaryMessages.includes(argument),
        )

        expect(containsExpectedError || containsExpectedBoundaryMessage).toBe(true)
      }
    } finally {
      consoleError.mockRestore()
    }
  })

  it('renders children when no error occurs', () => {
    render(
      <InsightsErrorBoundary fallback="Error loading insights">
        <div>Analytics content</div>
      </InsightsErrorBoundary>,
    )

    expect(screen.getByText('Analytics content')).toBeInTheDocument()
  })
})
