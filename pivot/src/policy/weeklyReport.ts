import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';
import { listScoreAuditWithOutcomes } from './policyClient';
import { DEFAULT_WEIGHTS, type ScoreWeights } from './scoring';

interface AuditRecord {
  dispatchedAt: number;
  chosenTaskId: string;
  breakdownJson: string;
  outcome: string;
  weightsVersion: number;
}

interface FactorStats {
  meanAccepted: number;
  meanRejected: number;
  meanAll: number;
  correlation: number;
  contribution: number;
}

/**
 * Formats data for display
 * @param records - Array of audit records with breakdown and outcome
 * @param factor - Factor name to compute statistics for
 * @returns FactorStats with mean values and correlation
 */
function computeFactorStats(
  records: AuditRecord[],
  factor: string,
): FactorStats {
  const accepted = records.filter((r) => r.outcome === 'accepted');
  const rejected = records.filter((r) => r.outcome === 'rejected');

  const values = records.map((r) => {
    const bd = JSON.parse(r.breakdownJson);
    return bd[factor] ?? 0;
  });

  const acceptedValues = accepted.map((r) => {
    const bd = JSON.parse(r.breakdownJson);
    return bd[factor] ?? 0;
  });

  const rejectedValues = rejected.map((r) => {
    const bd = JSON.parse(r.breakdownJson);
    return bd[factor] ?? 0;
  });

  const mean = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length);
  const meanAll = mean(values);
  const meanAccepted = mean(acceptedValues);
  const meanRejected = mean(rejectedValues);

  // Simple point-biserial correlation approximation
  const n1 = acceptedValues.length;
  const n0 = rejectedValues.length;
  const n = n1 + n0;
  const sd = standardDeviation(values);
  const correlation = n === 0 || sd === 0 ? 0 : ((meanAccepted - meanRejected) / sd) * Math.sqrt((n1 * n0) / (n * n));

  // Contribution = weight * meanFactorValue (using default weights as baseline)
  const weight = (DEFAULT_WEIGHTS as unknown as Record<string, number>)[factor] ?? 0;
  const contribution = weight * meanAll;

  return { meanAccepted, meanRejected, meanAll, correlation, contribution };
}

/**
 * Calculate standard deviation of a numeric array
 * @param values - Array of numeric values
 * @returns Standard deviation, or 0 if array is empty
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Compute counterfactual analysis comparing active vs alternate weight outcomes
 * @param records - Array of audit records
 * @param activeWeights - Current active weight configuration
 * @param altWeights - Alternate weight configuration to compare
 * @returns Object with changedDispatches count, totalDispatches, and example diffs
 */
function computeCounterfactual(
  records: AuditRecord[],
  activeWeights: Partial<ScoreWeights>,
  altWeights: Partial<ScoreWeights>,
): { changedDispatches: number; totalDispatches: number; examples: string[] } {
  let changed = 0;
  const examples: string[] = [];

  for (const record of records) {
    const bd = JSON.parse(record.breakdownJson) as Record<string, number>;
    let activeScore = 0;
    let altScore = 0;

    for (const [key, value] of Object.entries(bd)) {
      const aw = (activeWeights as Record<string, number>)[key] ?? 0;
      const nw = (altWeights as Record<string, number>)[key] ?? 0;
      activeScore += value * aw;
      altScore += value * nw;
    }

    // Simplified: check if the ranking would have changed significantly
    if (Math.sign(activeScore) !== Math.sign(altScore) || Math.abs(activeScore - altScore) > Math.abs(activeScore) * 0.5) {
      changed++;
      if (examples.length < 5) {
        examples.push(`${record.chosenTaskId}: active=${activeScore.toFixed(3)} alt=${altScore.toFixed(3)} outcome=${record.outcome}`);
      }
    }
  }

  return { changedDispatches: changed, totalDispatches: records.length, examples };
}

/**
 * Get week number from a date
 * @param date - Date to extract week number from
 * @returns Tuple of [year, weekNumber]
 */
function getWeekNumber(date: Date): [number, number] {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
}

/**
 * Render report
 * @param records - Array of audit records to include in report
 * @param weekLabel - Week identifier label (e.g., "2024-W05")
 * @param factors - Array of factor names to include in the report
 * @returns Markdown-formatted report string
 */
function renderReport(
  records: AuditRecord[],
  weekLabel: string,
  factors: string[],
): string {
  const accepted = records.filter((r) => r.outcome === 'accepted').length;
  const rejected = records.filter((r) => r.outcome === 'rejected').length;
  const rework = records.filter((r) => r.outcome === 'rework').length;

  const lines: string[] = [
    `# Weekly Scoring Report — ${weekLabel}`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Dispatches with outcomes: ${records.length} (accepted: ${accepted}, rejected: ${rejected}, rework: ${rework})`,
    '',
    '## Per-Factor Contribution to Winning Scores',
    '',
    '| Factor | Weight | Mean Value | Contribution | Correlation w/ Success |',
    '|--------|--------|------------|-------------|----------------------|',
  ];

  for (const factor of factors) {
    const stats = computeFactorStats(records, factor);
    const weight = (DEFAULT_WEIGHTS as unknown as Record<string, number>)[factor] ?? 0;
    lines.push(
      `| ${factor} | ${weight.toFixed(2)} | ${stats.meanAll.toFixed(4)} | ${stats.contribution.toFixed(4)} | ${stats.correlation.toFixed(4)} |`,
    );
  }

  lines.push('', '## Outcome Correlation Detail', '');

  for (const factor of factors) {
    const stats = computeFactorStats(records, factor);
    const direction = stats.correlation > 0.1 ? 'positive' : stats.correlation < -0.1 ? 'negative' : 'neutral';
    lines.push(
      `- **${factor}**: accepted mean=${stats.meanAccepted.toFixed(4)}, rejected mean=${stats.meanRejected.toFixed(4)}, correlation=${stats.correlation.toFixed(4)} (${direction})`,
    );
  }

  // Counterfactual with "cost-conservative" preset (lower cost weight, higher reliability)
  const costConservative: Partial<ScoreWeights> = {
    ...DEFAULT_WEIGHTS,
    expectedCost: 1.5,
    harnessReliability: 1.5,
    regressionRisk: -1.5,
  };

  const counterfactual = computeCounterfactual(records, DEFAULT_WEIGHTS, costConservative);

  lines.push(
    '',
    '## Counterfactual: Cost-Conservative Preset',
    '',
    `If "cost-conservative" weights had been used instead of defaults:`,
    `- Changed dispatches: ${counterfactual.changedDispatches}/${counterfactual.totalDispatches}`,
    '',
  );

  if (counterfactual.examples.length > 0) {
    lines.push('Examples:', '');
    for (const ex of counterfactual.examples) {
      lines.push(`- ${ex}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Main entry point - generates weekly scoring report from Convex
 * Fetches score audit records from the past week, computes factor statistics,
 * and writes a markdown report to the measure/reports directory
 */
export async function main() {
  const client = createConvexClient();
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const since = now - weekMs;
  const [year, week] = getWeekNumber(new Date());
  const weekLabel = `${year}-W${String(week).padStart(2, '0')}`;

  console.log(`Generating weekly report for ${weekLabel}...`);

  const records = (await listScoreAuditWithOutcomes(client, since, 1000)) as unknown as AuditRecord[];

  if (records.length === 0) {
    console.log('No dispatch records with outcomes found for the past week. Report skipped.');
    return;
  }

  const factors = Object.keys(DEFAULT_WEIGHTS);
  const report = renderReport(records, weekLabel, factors);

  const reportsDir = join(process.cwd(), '..', 'measure', 'reports');
  mkdirSync(reportsDir, { recursive: true });
  const filePath = join(reportsDir, `scoring-weekly-${weekLabel}.md`);
  writeFileSync(filePath, report, 'utf8');

  console.log(`Report written to ${filePath} (${records.length} dispatches analyzed)`);
}

if (import.meta.main) {
  await main();
}
