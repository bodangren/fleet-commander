import { describe, expect, it } from 'vitest'
import { STAGES, formatDuration, getStageStatus } from './timeline'

describe('STAGES', () => {
  it('has 5 stages ending with merger', () => {
    expect(STAGES).toEqual(['dispatch', 'architect', 'executor', 'reviewer', 'merger'])
  })
})

describe('formatDuration', () => {
  it('formats under 1 minute as seconds', () => {
    expect(formatDuration(30000)).toBe('30s')
    expect(formatDuration(59000)).toBe('59s')
  })

  it('formats minutes without seconds when exact', () => {
    expect(formatDuration(60000)).toBe('1m')
    expect(formatDuration(120000)).toBe('2m')
  })

  it('formats minutes with remaining seconds', () => {
    expect(formatDuration(65000)).toBe('1m 5s')
    expect(formatDuration(125000)).toBe('2m 5s')
  })
})

describe('getStageStatus', () => {
  it('returns pending when no run exists for stage', () => {
    const runs = [{ _id: 'r1', taskId: 't1', stage: 'dispatch', startTime: 0, status: 'completed', createdAt: 0 }]
    expect(getStageStatus('architect', runs)).toEqual({ status: 'pending' })
  })

  it('returns done for completed run', () => {
    const runs = [{ _id: 'r1', taskId: 't1', stage: 'dispatch', startTime: 0, endTime: 1000, status: 'completed', createdAt: 0 }]
    const result = getStageStatus('dispatch', runs)
    expect(result.status).toBe('done')
    expect(result.run).toBeDefined()
  })

  it('returns active for running run', () => {
    const runs = [{ _id: 'r1', taskId: 't1', stage: 'dispatch', startTime: 0, status: 'running', createdAt: 0 }]
    const result = getStageStatus('dispatch', runs)
    expect(result.status).toBe('active')
  })

  it('returns done for failed run', () => {
    const runs = [{ _id: 'r1', taskId: 't1', stage: 'dispatch', startTime: 0, endTime: 1000, status: 'failed', createdAt: 0 }]
    const result = getStageStatus('dispatch', runs)
    expect(result.status).toBe('done')
  })
})
