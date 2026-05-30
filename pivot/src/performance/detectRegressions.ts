/**
 * Detect performance regressions by comparing baselines across time windows
 * and create alerts for significant degradations.
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
