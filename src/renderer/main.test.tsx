import { describe, it, expect, vi, beforeEach } from 'vitest'

const initializeRendererLogStreaming = vi.hoisted(() => vi.fn())
const render = vi.hoisted(() => vi.fn())
const createRoot = vi.hoisted(() => vi.fn(() => ({ render })))

vi.mock('./log-stream', () => ({
  initializeRendererLogStreaming,
}))

vi.mock('./App', () => ({
  default: () => null,
}))

vi.mock('react-dom/client', () => ({
  default: {
    createRoot,
  },
}))

describe('renderer entry', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    createRoot.mockClear()
    render.mockClear()
    initializeRendererLogStreaming.mockClear()
    vi.resetModules()
  })

  it('initializes log streaming and renders the app', async () => {
    await import('./main')

    expect(initializeRendererLogStreaming).toHaveBeenCalledTimes(1)
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'))
    expect(render).toHaveBeenCalled()
  })
})
