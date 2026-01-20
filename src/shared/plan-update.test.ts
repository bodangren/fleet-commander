import { describe, it, expect } from 'vitest'
import type { PlanUpdateResponse } from './plan-update'

describe('Plan update types', () => {
  it('supports typed plan update responses', () => {
    const response: PlanUpdateResponse = { ok: true }
    expect(response.ok).toBe(true)
  })
})
