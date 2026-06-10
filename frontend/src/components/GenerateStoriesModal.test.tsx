import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { GenerateStoriesModal } from '@/components/GenerateStoriesModal'
import type { GeneratedStoryPreview } from '@/components/GenerateStoriesModal'

const sampleStories: GeneratedStoryPreview[] = [
  {
    title: 'Sign up',
    asA: 'new user',
    iWant: 'to register',
    soThat: 'I can use the app',
    acceptanceCriteria: ['Email required'],
    estimate: 'M',
    priority: 'Must',
  },
  {
    title: 'Log in',
    asA: 'returning user',
    iWant: 'to log in',
    soThat: 'I can resume',
    acceptanceCriteria: ['Password required'],
    estimate: 'S',
    priority: 'Should',
  },
]

describe('GenerateStoriesModal', () => {
  it('shows the goal form when no stories are present', () => {
    render(
      <GenerateStoriesModal
        trackId="tr1"
        generating={false}
        committing={false}
        error={null}
        stories={null}
        onGenerate={vi.fn()}
        onCommit={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/goal override/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })

  it('calls onGenerate with the trimmed goal when Generate is clicked', () => {
    const onGenerate = vi.fn()
    render(
      <GenerateStoriesModal
        trackId="tr1"
        generating={false}
        committing={false}
        error={null}
        stories={null}
        onGenerate={onGenerate}
        onCommit={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText(/goal override/i), {
      target: { value: '  Build the thing  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(onGenerate).toHaveBeenCalledWith('Build the thing')
  })

  it('shows generating label and disables button while generating', () => {
    render(
      <GenerateStoriesModal
        trackId="tr1"
        generating={true}
        committing={false}
        error={null}
        stories={null}
        onGenerate={vi.fn()}
        onCommit={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })

  it('renders preview list when stories are present', () => {
    render(
      <GenerateStoriesModal
        trackId="tr1"
        generating={false}
        committing={false}
        error={null}
        stories={sampleStories}
        onGenerate={vi.fn()}
        onCommit={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/story preview list/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sign up')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Log in')).toBeInTheDocument()
  })

  it('removes a story when Remove is clicked', () => {
    render(
      <GenerateStoriesModal
        trackId="tr1"
        generating={false}
        committing={false}
        error={null}
        stories={sampleStories}
        onGenerate={vi.fn()}
        onCommit={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /remove story 1/i }))
    expect(screen.queryByDisplayValue('Sign up')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Log in')).toBeInTheDocument()
  })

  it('calls onCommit with edited stories on Commit', () => {
    const onCommit = vi.fn()
    render(
      <GenerateStoriesModal
        trackId="tr1"
        generating={false}
        committing={false}
        error={null}
        stories={sampleStories}
        onGenerate={vi.fn()}
        onCommit={onCommit}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByDisplayValue('Sign up'), {
      target: { value: 'Account Creation' },
    })
    fireEvent.click(screen.getByRole('button', { name: /commit/i }))
    expect(onCommit).toHaveBeenCalledTimes(1)
    const args = onCommit.mock.calls[0][0] as GeneratedStoryPreview[]
    expect(args).toHaveLength(2)
    expect(args[0].title).toBe('Account Creation')
  })

  it('renders an error banner when error prop is set', () => {
    render(
      <GenerateStoriesModal
        trackId="tr1"
        generating={false}
        committing={false}
        error="Harness offline"
        stories={null}
        onGenerate={vi.fn()}
        onCommit={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/harness offline/i)).toBeInTheDocument()
  })

  it('disables Commit while committing=true', () => {
    render(
      <GenerateStoriesModal
        trackId="tr1"
        generating={false}
        committing={true}
        error={null}
        stories={sampleStories}
        onGenerate={vi.fn()}
        onCommit={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /committing/i })).toBeDisabled()
  })
})
