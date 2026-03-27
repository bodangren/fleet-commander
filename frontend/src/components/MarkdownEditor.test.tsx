import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MarkdownEditor } from './MarkdownEditor'

describe('MarkdownEditor', () => {
  it('renders syntax and preview panes and forwards edits', () => {
    const onChange = vi.fn()

    render(
      <MarkdownEditor
        label="System Prompt"
        value="# Heading\n\n- first item\n\n`inline code`"
        onChange={onChange}
      />,
    )

    expect(screen.getByText('Syntax')).toBeInTheDocument()
    expect(screen.getByText('Rendered Preview')).toBeInTheDocument()
    expect(screen.getAllByText(/Heading/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/first item/).length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText('System Prompt'), {
      target: { value: '# Updated' },
    })

    expect(onChange).toHaveBeenCalledWith('# Updated')
  })
})
