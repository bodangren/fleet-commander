export function constructRetrospectivePrompt(data: unknown): string {
  const d = data as Record<string, unknown>;
  const taskCounts = (d.taskCounts ?? {}) as Record<string, number>;
  const agentWorkload = (d.agentWorkload ?? []) as Array<Record<string, unknown>>;
  const issuePatterns = (d.issuePatterns ?? []) as Array<Record<string, unknown>>;
  const velocity = (d.velocity ?? {}) as Record<string, number>;
  const hookFailures = (d.hookFailures ?? []) as Array<Record<string, unknown>>;
  const sessionMetrics = (d.sessionMetrics ?? {}) as Record<string, unknown>;
  const priorityCorrelation = (d.priorityCorrelation ?? []) as Array<Record<string, unknown>>;
  const blockedByChains = (d.blockedByChains ?? []) as Array<Record<string, unknown>>;
  const topErrors = (d.topErrors ?? []) as Array<Record<string, unknown>>;

  let prompt = `You are a sprint retrospective analyst. Analyze the following sprint data and generate a structured markdown report with exactly these sections: Sprint Summary, Patterns Detected, Top Blockers, Improvement Suggestions, Agent Workload Balance, Priority Accuracy.\n\n`;

  prompt += `# Sprint: ${d.sprintName ?? 'Unknown'} (${(d.dateRange as any)?.start ?? '?'} to ${(d.dateRange as any)?.end ?? '?'})\n\n`;

  prompt += `## Task Summary\n`;
  prompt += `- Planned: ${taskCounts.planned ?? 0}\n`;
  prompt += `- Completed: ${taskCounts.completed ?? 0}\n`;
  prompt += `- Blocked: ${taskCounts.blocked ?? 0}\n`;
  prompt += `- Failed: ${taskCounts.failed ?? 0}\n`;
  prompt += `- Carried Over: ${taskCounts.carriedOver ?? 0}\n`;
  prompt += `- Completion Rate: ${Math.round((velocity.completionRate ?? 0) * 100)}%\n\n`;

  prompt += `## Agent Workload\n`;
  for (const aw of agentWorkload) {
    prompt += `- ${aw.agent}: ${aw.tasksAssigned} assigned, ${aw.tasksCompleted} completed, avg ${aw.avgDurationMs}ms\n`;
  }
  prompt += '\n';

  prompt += `## Issue Patterns\n`;
  for (const ip of issuePatterns.slice(0, 10)) {
    prompt += `- ${ip.pattern}: ${ip.count} occurrences\n`;
  }
  prompt += '\n';

  prompt += `## Hook Failures\n`;
  for (const hf of hookFailures) {
    prompt += `- ${hf.phase}: ${hf.count} failures\n`;
  }
  prompt += '\n';

  prompt += `## Session Metrics\n`;
  prompt += `- Total Sessions: ${sessionMetrics.totalSessions ?? 0}\n`;
  prompt += `- Resumed Sessions: ${sessionMetrics.resumedSessions ?? 0}\n`;
  prompt += `- Continuation Rate: ${Math.round((sessionMetrics.continuationRate as number ?? 0) * 100)}%\n\n`;

  prompt += `## Priority Correlation\n`;
  for (const pc of priorityCorrelation) {
    prompt += `- ${pc.priority}: ${pc.completed}/${pc.total} completed (${Math.round((pc.completionRate as number ?? 0) * 100)}%), avg cycle ${pc.avgCycleTimeMs}ms\n`;
  }
  prompt += '\n';

  prompt += `## Blocked-By Chains\n`;
  for (const bc of blockedByChains.slice(0, 10)) {
    prompt += `- ${bc.taskKey}: ${bc.blockerCount} blockers, cycle time ${bc.cycleTimeMs ?? 'N/A'}ms\n`;
  }
  prompt += '\n';

  prompt += `## Top Errors\n`;
  for (const te of topErrors.slice(0, 10)) {
    prompt += `- ${te.message}: ${te.count} times\n`;
  }
  prompt += '\n';

  prompt += `## Priority Accuracy\n`;
  prompt += `Did tasks tagged with higher priority (#priority:critical, #priority:high) complete faster or more reliably than lower-priority tasks? Compare completion rates and average cycle times across priority levels. Point out any misalignment where critical tasks were not treated with appropriate urgency.\n\n`;

  prompt += `## Instructions\n`;
  prompt += `1. Base every observation strictly on the data provided above. Do not invent facts.\n`;
  prompt += `2. In Improvement Suggestions, be specific and actionable. Instead of generic advice like "improve communication," give concrete next steps like "Add a 5-minute dependency-review step to sprint planning for tasks with #blocked_by chains longer than 2."\n`;
  prompt += `3. In Top Blockers, name the exact error message or dependency pattern that caused the stall.\n`;
  prompt += `4. In Agent Workload Balance, flag specific agents that are over/under-utilized and suggest task rebalancing.\n`;
  prompt += `5. Keep the entire report under 800 words.\n\n`;

  prompt += `Generate the retrospective report now in markdown format.`;

  return prompt;
}

const REQUIRED_SECTIONS = [
  'sprint summary',
  'patterns detected',
  'top blockers',
  'improvement suggestions',
  'agent workload balance',
  'priority accuracy',
];

export function validateRetrospectiveReport(report: string): { valid: boolean; missing: string[] } {
  const lower = report.toLowerCase();
  const missing = REQUIRED_SECTIONS.filter((section) => !lower.includes(section));
  return { valid: missing.length === 0, missing };
}
