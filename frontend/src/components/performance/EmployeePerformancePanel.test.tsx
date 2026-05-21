import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  EmployeePerformancePanel,
  type TaskKindMetric,
  type RegressionAlert,
} from './EmployeePerformancePanel'

const mockMetrics: TaskKindMetric[] = [
  {
    taskKind: 'feature',
    avgDurationMs: 120000,
    p50DurationMs: 110000,
    p95DurationMs: 200000,
    completionRate: 0.85,
    sampleCount: 10,
  },
  {
    taskKind: 'bugfix',
    avgDurationMs: 80000,
    p50DurationMs: 75000,
    p95DurationMs: 150000,
    completionRate: 0.92,
    sampleCount: 8,
  },
]

const mockRegressions: RegressionAlert[] = [
  {
    taskKind: 'feature',
    metric: 'avgDurationMs',
    severity: 'warning',
    degradationPercent: 25,
    baselineValue: 100000,
    currentValue: 125000,
  },
]

const mockTrend = [100000, 110000, 105000, 120000]

describe('EmployeePerformancePanel', () => {
  it('renders bar chart with task kind data', () => {
    render(
      <EmployeePerformancePanel
        employeeId="emp-1"
        projectId="demo-project"
        metrics={mockMetrics}
        regressions={[]}
        trend={mockTrend}
      />,
    )
    expect(screen.getByTestId('performance-bar-chart')).toBeInTheDocument()
    expect(screen.getAllByText('feature').length).toBeGreaterThan(0)
    expect(screen.getAllByText('bugfix').length).toBeGreaterThan(0)
  })

  it('renders completion rate gauge', () => {
    render(
      <EmployeePerformancePanel
        employeeId="emp-1"
        projectId="demo-project"
        metrics={mockMetrics}
        regressions={[]}
        trend={mockTrend}
      />,
    )
    expect(screen.getByTestId('completion-rate-gauge')).toBeInTheDocument()
    expect(screen.getByText(/85%/)).toBeInTheDocument()
  })

  it('renders trend sparkline for last 4 windows', () => {
    render(
      <EmployeePerformancePanel
        employeeId="emp-1"
        projectId="demo-project"
        metrics={mockMetrics}
        regressions={[]}
        trend={mockTrend}
      />,
    )
    expect(screen.getByTestId('performance-trend-sparkline')).toBeInTheDocument()
  })

  it('renders regression alert badges when regressions exist', () => {
    render(
      <EmployeePerformancePanel
        employeeId="emp-1"
        projectId="demo-project"
        metrics={mockMetrics}
        regressions={mockRegressions}
        trend={mockTrend}
      />,
    )
    expect(screen.getByTestId('regression-alert-badge')).toBeInTheDocument()
    expect(screen.getByText(/feature.*degraded.*25%/i)).toBeInTheDocument()
  })

  it('renders empty state when no metrics provided', () => {
    render(
      <EmployeePerformancePanel
        employeeId="emp-1"
        projectId="demo-project"
        metrics={null}
        regressions={[]}
        trend={[]}
      />,
    )
    expect(screen.getByText(/no performance data/i)).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(
      <EmployeePerformancePanel
        employeeId="emp-1"
        projectId="demo-project"
        metrics={null}
        regressions={[]}
        trend={[]}
        loading={true}
      />,
    )
    expect(screen.getByText(/loading performance data/i)).toBeInTheDocument()
  })
})
