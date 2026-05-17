/**
 * Detect performance regressions by comparing current baselines against
 * previous window baselines, and create alerts for significant degradations.
 */

import type { BaselineRecord } from './computeBaselines';

export interface DetectRegressionsDeps {
  queryCurrentBaselines: (args: {
    employeeId: string;
    projectSlug: string;
    windowDays: number;
  }) => Promise<BaselineRecord[]>;
  queryPreviousBaselines: (args: {
    employeeId: string;
    projectSlug: string;
    windowDays: number;
  }) => Promise<BaselineRecord[]>;
  createAlert: (args: {
    type: string;
    severity: string;
    message: string;
    contextJson?: string;
  }) => Promise<string>;
}

export interface DetectRegressionsOptions {
  employeeId: string;
  projectSlug: string;
  windowDays: number;
}

export interface RegressionAlert {
  employeeId: string;
  taskKind: string;
  metric: 'avgDurationMs' | 'completionRate';
  severity: 'critical' | 'warning' | 'info';
  degradationPercent: number;
  baselineValue: number;
  currentValue: number;
}

export async function detectRegressions(
  deps: DetectRegressionsDeps,
  options: DetectRegressionsOptions,
): Promise<RegressionAlert[]> {
  throw new Error('Not implemented');
}
