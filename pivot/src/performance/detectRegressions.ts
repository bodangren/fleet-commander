import type { BaselineRecord } from './computeBaselines';
import { evaluateRegression } from './evaluateRegression';

export interface DetectRegressionsDeps {
  queryCurrentBaselines(args: DetectRegressionsOptions): Promise<BaselineRecord[]>;
  queryPreviousBaselines(args: DetectRegressionsOptions): Promise<BaselineRecord[]>;
  createAlert(args: {
    type: 'performance_regression';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    contextJson: string;
  }): Promise<string>;
}

export interface DetectRegressionsOptions {
  employeeId: string;
  projectSlug: string;
  windowDays: number;
}

export interface RegressionAlert {
  alerted: boolean;
  employeeId: string;
  taskKind: string;
  metric: 'avgDurationMs' | 'completionRate';
  severity: 'critical' | 'warning' | 'info';
  degradationPercent: number;
  baselineValue: number;
  currentValue: number;
}

/**
 * Detect performance regressions by comparing current and previous baselines.
 * @param deps - Data access functions for baselines and alert creation
 * @param options - Employee, project, and time-window options
 * @returns Regression alerts created from significant degradations
 */
export async function detectRegressions(
  deps: DetectRegressionsDeps,
  options: DetectRegressionsOptions,
): Promise<RegressionAlert[]> {
  const { employeeId, projectSlug, windowDays } = options;

  const [currentBaselines, previousBaselines] = await Promise.all([
    deps.queryCurrentBaselines({ employeeId, projectSlug, windowDays }),
    deps.queryPreviousBaselines({ employeeId, projectSlug, windowDays }),
  ]);

  if (currentBaselines.length === 0 || previousBaselines.length === 0) {
    return [];
  }

  const previousByTaskKind = new Map<string, BaselineRecord>();
  for (const prev of previousBaselines) {
    previousByTaskKind.set(prev.taskKind, prev);
  }

  const alerts: RegressionAlert[] = [];

  for (const current of currentBaselines) {
    if (current.sampleCount < 5) {
      continue;
    }

    const previous = previousByTaskKind.get(current.taskKind);
    if (!previous) {
      continue;
    }

    const durationResult = evaluateRegression({
      current: current.avgDurationMs,
      baseline: previous.avgDurationMs,
      threshold: 0.2,
      direction: 'increase',
    });

    if (durationResult.alerted) {
      alerts.push({
        alerted: true,
        employeeId,
        taskKind: current.taskKind,
        metric: 'avgDurationMs',
        severity: durationResult.severity,
        degradationPercent: durationResult.degradationPercent,
        baselineValue: previous.avgDurationMs,
        currentValue: current.avgDurationMs,
      });
    }

    const rateResult = evaluateRegression({
      current: current.completionRate,
      baseline: previous.completionRate,
      threshold: 0.15,
      direction: 'decrease',
    });

    if (rateResult.alerted) {
      alerts.push({
        alerted: true,
        employeeId,
        taskKind: current.taskKind,
        metric: 'completionRate',
        severity: rateResult.severity,
        degradationPercent: rateResult.degradationPercent,
        baselineValue: previous.completionRate,
        currentValue: current.completionRate,
      });
    }
  }

  for (const alert of alerts) {
    await deps.createAlert({
      type: 'performance_regression',
      severity: alert.severity,
      message: `Performance regression for ${alert.taskKind}: ${alert.metric} degraded ${alert.degradationPercent}% (baseline: ${alert.baselineValue}, current: ${alert.currentValue})`,
      contextJson: JSON.stringify({ employeeId, taskKind: alert.taskKind, metric: alert.metric }),
    });
  }

  return alerts;
}
