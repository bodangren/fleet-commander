import { type ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { parseInlineTokens, renderMarkdownBlocks } from '@/lib/markdown'

type MarkdownEditorProps = {
  label: string
  value: string
  placeholder?: string
  readOnly?: boolean
  onChange: (value: string) => void
}

/**
 * Render inline tokens with source-view styling (cyan-tinted)
 * @param value - Text to render with inline formatting
 * @returns Array of React nodes
 */
function renderSourceInlineTokens(value: string): ReactNode[] {
  return parseInlineTokens(value).map((token, tokenIndex) => {
    switch (token.kind) {
      case 'strong':
        return (
          <strong key={tokenIndex} className="text-cyan-200">
            {token.text}
          </strong>
        )
      case 'em':
        return (
          <em key={tokenIndex} className="text-emerald-200">
            {token.text}
          </em>
        )
      case 'code':
        return (
          <code
            key={tokenIndex}
            className="rounded px-1.5 py-0.5 font-mono text-[0.92em] bg-cyan-400/10 text-cyan-200"
          >
            {token.text}
          </code>
        )
      case 'link':
        return (
          <span key={tokenIndex} className="text-sky-200">
            {token.text}
            {token.href ? `(${token.href})` : null}
          </span>
        )
      default:
        return <span key={tokenIndex}>{token.text}</span>
    }
  })
}

/**
 * Render source line with syntax highlighting
 * @param line - Source line text
 * @param index - Line index for key
 * @returns React node for the source line
 */
function renderSourceLine(line: string, index: number) {
  const trimmed = line.trim()
  if (trimmed === '') {
    return (
      <div key={index} className="text-muted-foreground/40">
        {'\u00b7'}
      </div>
    )
  }

  const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
  if (headingMatch) {
    return (
      <div key={index}>
        <span className="text-cyan-300">{headingMatch[1]}</span>{' '}
        <span className="text-foreground">{renderSourceInlineTokens(headingMatch[2])}</span>
      </div>
    )
  }

  if (trimmed.startsWith('```')) {
    return (
      <div key={index} className="text-fuchsia-300">
        {trimmed}
      </div>
    )
  }

  if (/^[-*+]\s+/.test(trimmed)) {
    return (
      <div key={index}>
        <span className="text-cyan-300">{trimmed.slice(0, 2)}</span>
        <span className="text-foreground">{renderSourceInlineTokens(trimmed.slice(2))}</span>
      </div>
    )
  }

  if (trimmed.startsWith('>')) {
    return (
      <div key={index}>
        <span className="text-emerald-300">&gt;</span>{' '}
        <span className="text-foreground">
          {renderSourceInlineTokens(trimmed.replace(/^>\s?/, ''))}
        </span>
      </div>
    )
  }

  return <div key={index}>{renderSourceInlineTokens(line)}</div>
}

/**
 * Renders an editor component with markdown source and split preview
 * @param label - Editor label/title
 * @param value - Current markdown content
 * @param placeholder - Optional placeholder text
 * @param onChange - Callback when content changes
 */
export function MarkdownEditor({
  label,
  value,
  placeholder,
  readOnly = false,
  onChange,
}: MarkdownEditorProps) {
  const sourceLines = value.split(/\r?\n/)
  const previewBlocks = renderMarkdownBlocks(value)

  return (
    <section className="space-y-4 rounded-3xl border border-border/60 bg-black/10 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
          {label}
        </h3>
        <span className="text-xs text-muted-foreground">Markdown source and preview</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <label className="space-y-2 text-sm">
          <span className="block text-muted-foreground">Source</span>
          <textarea
            className="min-h-[28rem] w-full rounded-3xl border border-border/60 bg-background/90 p-4 font-mono text-sm leading-6 outline-none transition focus:border-cyan-400"
            value={value}
            readOnly={readOnly}
            onChange={event => {
              onChange(event.target.value)
            }}
            placeholder={placeholder}
            aria-label={label}
          />
        </label>

        <div className="space-y-4">
          <Card className="border-border/60 bg-background/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
                Syntax
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[14rem] overflow-auto rounded-2xl border border-border/60 bg-black/30 p-4 font-mono text-sm leading-6 text-muted-foreground">
                {sourceLines.some(line => line.trim()) ? (
                  sourceLines.map((line, index) => renderSourceLine(line, index))
                ) : (
                  <div className="italic text-muted-foreground/60">
                    Markdown syntax preview appears here as you type.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
                Rendered Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-4">
                {previewBlocks.length > 0 ? (
                  previewBlocks
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Preview appears here once the prompt body has content.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
