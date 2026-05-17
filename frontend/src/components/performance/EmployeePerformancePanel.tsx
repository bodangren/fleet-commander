export interface TaskKindMetric {
  taskKind: string;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  completionRate: number;
  sampleCount: number;
}

export interface RegressionAlert {
  taskKind: string;
  metric: 'avgDurationMs' | 'completionRate';
  severity: 'critical' | 'warning' | 'info';
  degradationPercent: number;
  baselineValue: number;
  currentValue: number;
}

export interface EmployeePerformancePanelProps {
  employeeId: string;
  projectId: string;
  metrics: TaskKindMetric[] | null;
  regressions: RegressionAlert[];
  trend: number[];
  loading?: boolean;
  error?: string | null;
}

export function EmployeePerformancePanel(_props: EmployeePerformancePanelProps) {
  return null;
}
