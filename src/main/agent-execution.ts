import type { ConductorTask } from '../shared/conductor';

const AGENT_TAG_RE = /\s*@[\w-]+\s*$/;

/**
 * Escapes a string for safe usage as a single-quoted shell argument.
 * Wraps the string in single quotes and escapes any internal single quotes.
 */
function escapeShellArg(arg: string): string {
  // Replace ' with '\'' (close quote, escaped quote, open quote)
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

export function expandAgentCommand(template: string, task: ConductorTask): string {
  const cleanTitle = task.title.replace(AGENT_TAG_RE, '').trim();

  let taskContext = cleanTitle;
  if (task.subTasks && task.subTasks.length > 0) {
    const subTasksList = task.subTasks
      .map(st => `  - ${st.marker} ${st.title}`)
      .join('\n');
    taskContext = `${cleanTitle}\n${subTasksList}`;
  }

  const escapedContext = escapeShellArg(taskContext);

  const singleQuoted = template.replace(/'{{task}}'/g, () => escapedContext);
  return singleQuoted.replace(/{{task}}/g, () => escapedContext);
}
