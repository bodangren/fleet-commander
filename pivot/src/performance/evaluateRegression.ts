/**
 * Evaluate if a metric regression is alerted and compute severity and degradation percentage.
 */
export function evaluateRegression(options: EvaluateRegressionOptions): RegressionEvaluation {
  const { current, baseline, threshold, direction } = options;

  if (baseline === 0) {
    return { alerted: false, severity: 'info', degradationPercent: 0 };
  }

  let alerted = false;
  let degradationPercent = 0;
  let severity: 'critical' | 'warning' | 'info' = 'info';

  if (direction === 'increase') {
    if (current > baseline) {
      degradationPercent = (current - baseline) / baseline * 100;
      const thresholdPercent = threshold * 100;
      if (degradationPercent > thresholdPercent) {
        alerted = true;
        severity = degradationPercent > 40 ? 'critical' : 'warning';
      }
    }
  } else {
    if (current < baseline) {
      degradationPercent = (baseline - current) / baseline * 100;
      const thresholdPercent = threshold * 100;
      if (degradationPercent > thresholdPercent) {
        alerted = true;
        severity = degradationPercent > 40 ? 'critical' : 'warning';
      }
    }
  }

  return { alerted, severity, degradationPercent: Math.round(degradationPercent) };
}
