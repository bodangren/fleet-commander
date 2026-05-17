/**
 * Pure function for evaluating a single metric regression.
 */

export type RegressionDirection = 'increase' | 'decrease';

export interface RegressionEvaluation {
  alerted: boolean;
  severity: 'critical' | 'warning' | 'info';
  degradationPercent: number;
}

export interface EvaluateRegressionOptions {
  current: number;
  baseline: number;
  threshold: number;
  direction: RegressionDirection;
}

export function evaluateRegression(options: EvaluateRegressionOptions): RegressionEvaluation {
  throw new Error('Not implemented');
}
