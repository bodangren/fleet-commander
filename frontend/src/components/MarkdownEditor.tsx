import { type ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type MarkdownEditorProps = {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

type InlineToken = {
  kind: 'text' | 'strong' | 'em' | 'code' | 'link'
  text: string
  href?: string
}

function parseInlineTokens(value: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let index = 0

  while (index < value.length) {
    if (value.startsWith('**', index)) {
      const end = value.indexOf('**', index + 2)
      if (end > index + 2) {
        tokens.push({ kind: 'strong', text: value.slice(index + 2, end) })
        index = end + 2
        continue
      }
    }

    if (value[index] === '`') {
      const end = value.indexOf('`', index + 1)
      if (end > index + 1) {
        tokens.push({ kind: 'code', text: value.slice(index + 1, end) })
        index = end + 1
        continue
      }
    }

    if (value[index] === '[') {
      const closeText = value.indexOf(']', index + 1)
      const openHref = closeText > -1 ? value.indexOf('(', closeText + 1) : -1
      const closeHref = openHref > -1 ? value.indexOf(')', openHref + 1) : -1
      if (closeText > index + 1 && openHref === closeText + 1 && closeHref > openHref + 1) {
        tokens.push({
          kind: 'link',
          text: value.slice(index + 1, closeText),
          href: value.slice(openHref + 1, closeHref),
        })
        index = closeHref + 1
        continue
      }
    }

    if (value[index] === '*' && value[index + 1] !== ' ') {
      const end = value.indexOf('*', index + 1)
      if (end > index + 1) {
        tokens.push({ kind: 'em', text: value.slice(index + 1, end) })
        index = end + 1
        continue
      }
    }

    let next = value.length
    for (const delimiter of ['**', '`', '[', '*']) {
      const position = value.indexOf(delimiter, index + 1)
      if (position !== -1 && position < next) {
        next = position
      }
    }

    tokens.push({ kind: 'text', text: value.slice(index, next) })
    index = next
  }

  return tokens
}

function renderInlineTokens(value: string, source = false): ReactNode[] {
  return parseInlineTokens(value).map((token, tokenIndex) => {
    switch (token.kind) {
      case 'strong':
        return (
          <strong
            key={tokenIndex}
            className={source ? 'text-cyan-200' : 'font-semibold text-foreground'}
          >
            {token.text}
          </strong>
        )
      case 'em':
        return (
          <em key={tokenIndex} className={source ? 'text-emerald-200' : 'italic text-foreground'}>
            {token.text}
          </em>
        )
      case 'code':
        return (
          <code
            key={tokenIndex}
            className={cn(
              'rounded px-1.5 py-0.5 font-mono text-[0.92em]',
              source ? 'bg-cyan-400/10 text-cyan-200' : 'bg-cyan-500/10 text-cyan-100',
            )}
          >
            {token.text}
          </code>
        )
      case 'link':
        return (
          <span key={tokenIndex} className={source ? 'text-sky-200' : 'text-sky-300 underline'}>
            {token.text}
            {source ? `(${token.href})` : null}
          </span>
        )
      default:
        return <span key={tokenIndex}>{token.text}</span>
    }
  })
}

function renderPreviewBlock(
  lines: string[],
  startIndex: number,
): { node: ReactNode; nextIndex: number } {
  const line = lines[startIndex]
  const trimmed = line.trim()

  const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
  if (headingMatch) {
    const level = headingMatch[1].length
    const text = headingMatch[2]
    const headingClass =
      level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : level === 3 ? 'text-lg' : 'text-base'

    return {
      node: (
        <div key={startIndex} className={cn('font-semibold tracking-tight', headingClass)}>
          {renderInlineTokens(text)}
        </div>
      ),
      nextIndex: startIndex + 1,
    }
  }

  if (trimmed.startsWith('```')) {
    const codeLines: string[] = []
    let cursor = startIndex + 1
    while (cursor < lines.length && !lines[cursor].trim().startsWith('```')) {
      codeLines.push(lines[cursor])
      cursor += 1
    }

    return {
      node: (
        <pre
          key={startIndex}
          className="overflow-x-auto rounded-2xl border border-border/60 bg-black/40 p-4 font-mono text-sm text-cyan-100"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      ),
      nextIndex: cursor < lines.length ? cursor + 1 : lines.length,
    }
  }

  if (/^[-*+]\s+/.test(trimmed)) {
    const items: string[] = []
    let cursor = startIndex
    while (cursor < lines.length && /^[-*+]\s+/.test(lines[cursor].trim())) {
      items.push(lines[cursor].trim().replace(/^[-*+]\s+/, ''))
      cursor += 1
    }

    return {
      node: (
        <ul key={startIndex} className="space-y-2">
          {items.map((item, itemIndex) => (
            <li
              key={`${startIndex}-${itemIndex}`}
              className="flex gap-2 text-sm text-muted-foreground"
            >
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
              <span>{renderInlineTokens(item)}</span>
            </li>
          ))}
        </ul>
      ),
      nextIndex: cursor,
    }
  }

  if (trimmed.startsWith('>')) {
    const quoteLines: string[] = []
    let cursor = startIndex
    while (cursor < lines.length && lines[cursor].trim().startsWith('>')) {
      quoteLines.push(lines[cursor].trim().replace(/^>\s?/, ''))
      cursor += 1
    }

    return {
      node: (
        <blockquote
          key={startIndex}
          className="border-l-2 border-cyan-400/60 pl-4 text-sm text-muted-foreground"
        >
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={`${startIndex}-${quoteIndex}`} className="m-0">
              {renderInlineTokens(quoteLine)}
            </p>
          ))}
        </blockquote>
      ),
      nextIndex: cursor,
    }
  }

  const paragraphLines: string[] = [line]
  let cursor = startIndex + 1
  while (
    cursor < lines.length &&
    lines[cursor].trim() !== '' &&
    !lines[cursor].trim().startsWith('#') &&
    !lines[cursor].trim().startsWith('```') &&
    !/^[-*+]\s+/.test(lines[cursor].trim()) &&
    !lines[cursor].trim().startsWith('>')
  ) {
    paragraphLines.push(lines[cursor])
    cursor += 1
  }

  return {
    node: (
      <p key={startIndex} className="m-0 text-sm leading-7 text-muted-foreground">
        {renderInlineTokens(paragraphLines.join(' '))}
      </p>
    ),
    nextIndex: cursor,
  }
}

function renderMarkdownPreview(value: string): ReactNode[] {
  const lines = value.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '') {
      index += 1
      continue
    }

    const { node, nextIndex } = renderPreviewBlock(lines, index)
    blocks.push(node)
    index = nextIndex
  }

  return blocks
}

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
        <span className="text-foreground">{renderInlineTokens(headingMatch[2], true)}</span>
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
        <span className="text-foreground">{renderInlineTokens(trimmed.slice(2), true)}</span>
      </div>
    )
  }

  if (trimmed.startsWith('>')) {
    return (
      <div key={index}>
        <span className="text-emerald-300">&gt;</span>{' '}
        <span className="text-foreground">
          {renderInlineTokens(trimmed.replace(/^>\s?/, ''), true)}
        </span>
      </div>
    )
  }

  return <div key={index}>{renderInlineTokens(line, true)}</div>
}

export function MarkdownEditor({ label, value, placeholder, onChange }: MarkdownEditorProps) {
  const sourceLines = value.split(/\r?\n/)
  const previewBlocks = renderMarkdownPreview(value)

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
