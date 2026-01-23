import type { ConductorTask } from '../shared/conductor';

const AGENT_TAG_RE = /\s*@[\w-]+\s*$/;

export function expandAgentCommand(template: string, task: ConductorTask): string {
  const cleanTitle = task.title.replace(AGENT_TAG_RE, '').trim();

  let taskContext = cleanTitle;
  if (task.subTasks && task.subTasks.length > 0) {
    const subTasksList = task.subTasks
      .map(st => `  - ${st.marker} ${st.title}`)
      .join('\n');
    taskContext = `${cleanTitle}\n${subTasksList}`;
  }

  return template.replace(/["']?{{task}}["']?/g, (match) => {
    if (match.startsWith('"') && match.endsWith('"')) {
      // Double quoted: escape " \ $ `
      const escaped = taskContext
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/`/g, '\\`');
      return `"${escaped}"`;
    }
    if (match.startsWith("'") && match.endsWith("'")) {
      // Single quoted: replace ' with '\'' (close, escaped quote, open)
      const escaped = taskContext.replace(/'/g, "'\\''");
      return `'${escaped}'`;
    }

    // Not quoted: wrap in SINGLE quotes for safety and prevent expansion
    const escaped = taskContext.replace(/'/g, "'\\''");
    return `'${escaped}'`;
  });
}
