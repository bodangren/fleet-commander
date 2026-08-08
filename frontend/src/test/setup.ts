import { afterEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import React from 'react'

expect.extend(matchers)

// Unit tests must never connect to a developer's live Convex deployment.
// Browser tests exercise that boundary through the real application instead.
vi.mock('../lib/convex', () => ({
  convexClient: null,
  isConvexAvailable: () => false,
}))

// `convex-data/core` and `useLogStream` read VITE_CONVEX_URL directly, then
// use this adapter to decide whether to open a Convex subscription. Keep the
// unit-test boundary on the Bun API even when .env.local configures Convex.
// Individual Convex adapter tests can still replace this module with their
// own `vi.mock('@/lib/dataAdapter', ...)` factory.
vi.mock('../lib/dataAdapter', async () => {
  const actual = await vi.importActual<typeof import('../lib/dataAdapter')>('../lib/dataAdapter')

  return {
    ...actual,
    getSliceConfig: () => ({
      projects: 'bun',
      agents: 'bun',
      harnesses: 'bun',
      tasks: 'bun',
      issues: 'bun',
      logs: 'bun',
      settings: 'bun',
    }),
  }
})

// Some route-level hooks import ConvexClient lazily, so disabling the shared
// React client alone is not sufficient. Replace the browser client itself in
// unit tests; this keeps an accidentally enabled slice from reaching a live
// deployment or creating an undici WebSocket. Tests that exercise the query
// adapter provide their own `vi.mock('convex/browser', ...)` implementation.
vi.mock('convex/browser', () => ({
  ConvexClient: vi.fn(() => ({
    onUpdate: vi.fn(() => () => {}),
    close: vi.fn(),
  })),
}))

// Keep raw WebSocket fallbacks offline as well. This is installed directly
// instead of through vi.stubGlobal so a test calling vi.unstubAllGlobals()
// cannot restore jsdom/undici's network-capable constructor.
class OfflineWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static readonly __fleetUnitTestOffline = true

  readonly readyState = OfflineWebSocket.CLOSED
  readonly url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string | URL) {
    this.url = String(url)
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false
  }
  send() {}
  close() {}
}

Object.defineProperty(globalThis, 'WebSocket', {
  configurable: true,
  writable: true,
  value: OfflineWebSocket,
})

afterEach(() => {
  cleanup()
})

// TD-113: Mock recharts so charts render deterministically in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')

  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      'div',
      { 'data-testid': 'recharts-container', style: { width: 500, height: 300 } },
      children,
    )

  const MockLineChart = ({
    data,
    children,
  }: {
    data: Array<Record<string, unknown>>
    children: React.ReactNode
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'line-chart' },
      data.map((d, i) =>
        React.createElement(
          'div',
          { key: i, className: 'data-point' },
          React.createElement('span', { className: 'label' }, String(d.name ?? d.stage ?? '')),
          React.createElement('span', { className: 'value' }, String(d.value ?? d.cost ?? '')),
        ),
      ),
      children,
    )

  const MockBarChart = ({
    data,
    children,
  }: {
    data: Array<Record<string, unknown>>
    children: React.ReactNode
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'bar-chart' },
      data.map((d, i) =>
        React.createElement(
          'div',
          { key: i, className: 'data-point' },
          React.createElement('span', { className: 'label' }, String(d.name ?? d.stage ?? '')),
          React.createElement('span', { className: 'value' }, String(d.value ?? d.cost ?? '')),
        ),
      ),
      children,
    )

  const MockPieChart = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'pie-chart' }, children)

  const MockXAxis = ({ dataKey }: { dataKey: string }) =>
    React.createElement('span', { 'data-testid': 'x-axis' }, `x:${dataKey}`)

  const MockYAxis = () => React.createElement('span', { 'data-testid': 'y-axis' }, 'y')

  const MockCartesianGrid = () => React.createElement('span', { 'data-testid': 'grid' }, 'grid')

  const MockTooltip = () => React.createElement('span', { 'data-testid': 'tooltip' }, 'tooltip')

  const MockLegend = ({ payload }: { payload?: Array<{ value: string }> }) =>
    React.createElement(
      'span',
      { 'data-testid': 'legend' },
      payload?.map(p => p.value).join(' ') || 'legend',
    )

  const MockLine = ({ dataKey, name }: { dataKey: string; name?: string }) =>
    React.createElement('span', { 'data-testid': 'line' }, name || dataKey)

  const MockBar = ({ dataKey, name }: { dataKey: string; name?: string }) =>
    React.createElement('span', { 'data-testid': 'bar' }, name || dataKey)

  const MockPie = ({
    data,
    dataKey,
    nameKey,
  }: {
    data: Array<Record<string, unknown>>
    dataKey: string
    nameKey: string
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'pie' },
      data.map((d, i) =>
        React.createElement(
          'div',
          { key: i, className: 'data-slice' },
          React.createElement('span', { className: 'label' }, String(d[nameKey] ?? '')),
          React.createElement('span', { className: 'value' }, String(d[dataKey] ?? '')),
        ),
      ),
    )

  const MockCell = ({ fill }: { fill: string }) =>
    React.createElement('span', { 'data-testid': 'cell' }, fill)

  return {
    ...actual,
    ResponsiveContainer: MockResponsiveContainer,
    LineChart: MockLineChart,
    BarChart: MockBarChart,
    PieChart: MockPieChart,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: MockCartesianGrid,
    Tooltip: MockTooltip,
    Legend: MockLegend,
    Line: MockLine,
    Bar: MockBar,
    Pie: MockPie,
    Cell: MockCell,
  }
})

// TD-113: Mock ResizeObserver and getBoundingClientRect for Recharts in jsdom
class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback
  }
  observe(element) {
    this.callback([{ target: element, contentRect: { width: 500, height: 500 } }], this)
  }
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock

Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  writable: true,
  value: () => ({
    width: 500,
    height: 500,
    top: 0,
    left: 0,
    bottom: 500,
    right: 500,
    x: 0,
    y: 0,
    toJSON: () => {},
  }),
})
