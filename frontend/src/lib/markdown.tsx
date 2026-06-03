import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type InlineToken = {
  kind: 'text' | 'strong' | 'em' | 'code' | 'link'
  text: string
  href?: string
}

/**
 * Parse inline markdown tokens (bold, italic, code, link) from a string
 * @param value - Markdown text to parse
 * @returns Array of inline tokens
 */
export function parseInlineTokens(value: string): InlineToken[] {
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

/**
 * Render a single markdown block (heading, code fence, list, blockquote, or paragraph)
 * @param lines - All lines of the markdown content
 * @param startIndex - Index of the first line of this block
 * @param renderInline - Function to render inline tokens (caller controls styling)
 * @returns Block node and index of next block
 */
export function renderPreviewBlock(
  lines: string[],
  startIndex: number,
  renderInline: (value: string) => ReactNode[],
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
          {renderInline(text)}
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
              <span>{renderInline(item)}</span>
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
              {renderInline(quoteLine)}
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
        {renderInline(paragraphLines.join(' '))}
      </p>
    ),
    nextIndex: cursor,
  }
}

/**
 * Render markdown text as an array of React block nodes using default styling
 * @param value - Markdown text to render
 * @returns Array of React nodes representing rendered blocks
 */
export function renderMarkdownBlocks(value: string): ReactNode[] {
  const lines = value.split(/\r?\n/)
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '') {
      index += 1
      continue
    }

    const { node, nextIndex } = renderPreviewBlock(lines, index, defaultRenderInline)
    blocks.push(node)
    index = nextIndex
  }

  return blocks
}

/**
 * Default inline renderer with standard styling
 */
function defaultRenderInline(value: string): ReactNode[] {
  return parseInlineTokens(value).map((token, tokenIndex) => {
    switch (token.kind) {
      case 'strong':
        return (
          <strong key={tokenIndex} className="font-semibold text-foreground">
            {token.text}
          </strong>
        )
      case 'em':
        return (
          <em key={tokenIndex} className="italic text-foreground">
            {token.text}
          </em>
        )
      case 'code':
        return (
          <code
            key={tokenIndex}
            className="rounded px-1.5 py-0.5 font-mono text-[0.92em] bg-cyan-500/10 text-cyan-100"
          >
            {token.text}
          </code>
        )
      case 'link':
        return (
          <a
            key={tokenIndex}
            href={token.href && /^javascript:/i.test(token.href) ? '#blocked' : token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-300 underline"
          >
            {token.text}
          </a>
        )
      default:
        return <span key={tokenIndex}>{token.text}</span>
    }
  })
}
