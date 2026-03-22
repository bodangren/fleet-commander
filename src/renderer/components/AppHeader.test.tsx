import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppHeader } from './AppHeader'

const mockWriteText = vi.fn().mockResolvedValue(undefined)

describe('AppHeader', () => {
  const mockOnSettingsClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the application title', () => {
    render(<AppHeader projectPath="" onSettingsClick={mockOnSettingsClick} />)
    expect(screen.getByText('Command Center')).toBeInTheDocument()
  })

  it('renders settings button with gear icon', () => {
    render(<AppHeader projectPath="" onSettingsClick={mockOnSettingsClick} />)
    const settingsButton = screen.getByRole('button', { name: 'Settings' })
    expect(settingsButton).toBeInTheDocument()
  })

  it('calls onSettingsClick when settings button is clicked', async () => {
    const user = userEvent.setup()
    render(<AppHeader projectPath="" onSettingsClick={mockOnSettingsClick} />)

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    expect(mockOnSettingsClick).toHaveBeenCalledTimes(1)
  })

  it('displays project path when provided', () => {
    render(<AppHeader projectPath="/home/user/my-project" onSettingsClick={mockOnSettingsClick} />)
    expect(screen.getByText('/home/user/my-project')).toBeInTheDocument()
  })

  it('does not display project path section when path is empty', () => {
    render(<AppHeader projectPath="" onSettingsClick={mockOnSettingsClick} />)
    expect(screen.queryByTestId('project-path-display')).not.toBeInTheDocument()
  })

  it('truncates long project paths in display', () => {
    render(
      <AppHeader
        projectPath="/very/long/path/to/some/deeply/nested/project/directory"
        onSettingsClick={mockOnSettingsClick}
      />,
    )
    const pathElement = screen.getByTestId('project-path-text')
    expect(pathElement).toHaveClass('truncate')
  })

  it('copies project path to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup()
    render(<AppHeader projectPath="/home/user/my-project" onSettingsClick={mockOnSettingsClick} />)

    const copyButton = screen.getByRole('button', { name: 'Copy project path' })
    await user.click(copyButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    })
  })

  it('shows copy success feedback after copying', async () => {
    const user = userEvent.setup()
    render(<AppHeader projectPath="/home/user/my-project" onSettingsClick={mockOnSettingsClick} />)

    const copyButton = screen.getByRole('button', { name: 'Copy project path' })
    await user.click(copyButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    })
  })

  it('resets copy button text after timeout', async () => {
    render(<AppHeader projectPath="/home/user/my-project" onSettingsClick={mockOnSettingsClick} />)

    const copyButton = screen.getByRole('button', { name: 'Copy project path' })
    copyButton.click()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    })
  })
})
