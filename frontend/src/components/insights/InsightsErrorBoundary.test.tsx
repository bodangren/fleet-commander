import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { InsightsErrorBoundary } from './InsightsErrorBoundary'

function Thrower({ message }: { message: string }) {
  throw new Error(message)
}

describe('InsightsErrorBoundary', () => {
  it('renders fallback UI when a child component throws', () => {
    render(
      <InsightsErrorBoundary fallback="Error loading insights">
        <Thrower message="Query failed" />
      </InsightsErrorBoundary>,
    )

    expect(screen.getByText('Error loading insights')).toBeInTheDocument()
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
