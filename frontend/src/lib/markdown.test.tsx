import { describe, it, expect } from 'vitest'
import { parseInlineTokens, renderMarkdownBlocks } from './markdown'
import { renderToString } from 'react-dom/server'

describe('parseInlineTokens', () => {
  it('returns plain text token for simple string', () => {
    const tokens = parseInlineTokens('hello world')
    expect(tokens).toEqual([{ kind: 'text', text: 'hello world' }])
  })

  it('parses bold tokens', () => {
    const tokens = parseInlineTokens('before **bold** after')
    expect(tokens).toEqual([
      { kind: 'text', text: 'before ' },
      { kind: 'strong', text: 'bold' },
      { kind: 'text', text: ' after' },
    ])
  })

  it('parses italic tokens', () => {
    const tokens = parseInlineTokens('before *italic* after')
    expect(tokens).toEqual([
      { kind: 'text', text: 'before ' },
      { kind: 'em', text: 'italic' },
      { kind: 'text', text: ' after' },
    ])
  })

  it('parses inline code tokens', () => {
    const tokens = parseInlineTokens('use `code` here')
    expect(tokens).toEqual([
      { kind: 'text', text: 'use ' },
      { kind: 'code', text: 'code' },
      { kind: 'text', text: ' here' },
    ])
  })

  it('parses link tokens', () => {
    const tokens = parseInlineTokens('click [here](https://example.com) now')
    expect(tokens).toEqual([
      { kind: 'text', text: 'click ' },
      { kind: 'link', text: 'here', href: 'https://example.com' },
      { kind: 'text', text: ' now' },
    ])
  })

  it('parses mixed inline tokens', () => {
    const tokens = parseInlineTokens('**bold** and *em* and `code`')
    expect(tokens).toEqual([
      { kind: 'strong', text: 'bold' },
      { kind: 'text', text: ' and ' },
      { kind: 'em', text: 'em' },
      { kind: 'text', text: ' and ' },
      { kind: 'code', text: 'code' },
    ])
  })

  it('handles empty string', () => {
    expect(parseInlineTokens('')).toEqual([])
  })

  it('handles unclosed bold by splitting on delimiter', () => {
    const tokens = parseInlineTokens('no **closing')
    expect(tokens).toEqual([
      { kind: 'text', text: 'no ' },
      { kind: 'text', text: '*' },
      { kind: 'text', text: '*closing' },
    ])
  })

  it('handles unclosed code by splitting on delimiter', () => {
    const tokens = parseInlineTokens('no `closing')
    expect(tokens).toEqual([
      { kind: 'text', text: 'no ' },
      { kind: 'text', text: '`closing' },
    ])
  })

  it('splits on * even when followed by space', () => {
    const tokens = parseInlineTokens('not * italic')
    expect(tokens).toEqual([
      { kind: 'text', text: 'not ' },
      { kind: 'text', text: '* italic' },
    ])
  })

  it('handles link with missing href as text', () => {
    const tokens = parseInlineTokens('[text without href')
    expect(tokens).toEqual([{ kind: 'text', text: '[text without href' }])
  })
})

describe('renderMarkdownBlocks', () => {
  it('renders a heading', () => {
    const blocks = renderMarkdownBlocks('# Hello')
    expect(blocks).toHaveLength(1)
    const html = renderToString(blocks[0])
    expect(html).toContain('Hello')
    expect(html).toContain('text-2xl')
  })

  it('renders h2 through h6 headings with correct classes', () => {
    const sizes = [
      ['##', 'text-xl'],
      ['###', 'text-lg'],
      ['####', 'text-base'],
    ]
    for (const [prefix, expectedClass] of sizes) {
      const blocks = renderMarkdownBlocks(`${prefix} Title`)
      const html = renderToString(blocks[0])
      expect(html).toContain(expectedClass)
    }
  })

  it('renders a code block', () => {
    const md = '```js\nconst x = 1\n```'
    const blocks = renderMarkdownBlocks(md)
    expect(blocks).toHaveLength(1)
    const html = renderToString(blocks[0])
    expect(html).toContain('const x = 1')
  })

  it('renders an unordered list', () => {
    const md = '- item one\n- item two'
    const blocks = renderMarkdownBlocks(md)
    expect(blocks).toHaveLength(1)
    const html = renderToString(blocks[0])
    expect(html).toContain('item one')
    expect(html).toContain('item two')
    expect(html).toContain('<li')
  })

  it('renders a blockquote', () => {
    const md = '> quoted text\n> more quote'
    const blocks = renderMarkdownBlocks(md)
    expect(blocks).toHaveLength(1)
    const html = renderToString(blocks[0])
    expect(html).toContain('quoted text')
    expect(html).toContain('blockquote')
  })

  it('renders a paragraph', () => {
    const blocks = renderMarkdownBlocks('simple paragraph')
    expect(blocks).toHaveLength(1)
    const html = renderToString(blocks[0])
    expect(html).toContain('simple paragraph')
    expect(html).toContain('<p')
  })

  it('skips blank lines between blocks', () => {
    const md = 'first paragraph\n\nsecond paragraph'
    const blocks = renderMarkdownBlocks(md)
    expect(blocks).toHaveLength(2)
  })

  it('renders inline formatting inside paragraphs', () => {
    const blocks = renderMarkdownBlocks('text with **bold** and `code`')
    const html = renderToString(blocks[0])
    expect(html).toContain('<strong')
    expect(html).toContain('<code')
  })

  it('handles empty input', () => {
    expect(renderMarkdownBlocks('')).toEqual([])
    expect(renderMarkdownBlocks('   ')).toEqual([])
  })
})
