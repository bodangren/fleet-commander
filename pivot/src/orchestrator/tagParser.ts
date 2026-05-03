export interface ParsedTask {
  status: 'pending' | 'in_progress' | 'done';
  assignee?: string;
  title: string;
  tags: Record<string, string>;
}

/**
 * Parses a plan.md task line into structured data.
 *
 * Supports formats:
 *   - [ ] @frontend Build component #priority:high #blocked_by:task-42
 *   - [~] Task in progress #persona:backend
 *   - [x] Completed task #harness:opencode
 */
export function parseTaskLine(line: string): ParsedTask | null {
  const trimmed = line.trim();
  const statusMatch = trimmed.match(/^-\s*\[([ ~x])\]\s*/);
  if (!statusMatch) return null;

  const statusChar = statusMatch[1];
  const status: ParsedTask['status'] =
    statusChar === 'x' ? 'done' : statusChar === '~' ? 'in_progress' : 'pending';

  let rest = trimmed.slice(statusMatch[0].length);

  // Extract tags: #key:value (must be at end or followed by more tags/whitespace)
  const tags: Record<string, string> = {};
  const tagRegex = /#(\w[\w-]*):(\S+)/g;
  let tagMatch;
  const tagPositions: Array<{ start: number; end: number }> = [];

  while ((tagMatch = tagRegex.exec(rest)) !== null) {
    tags[tagMatch[1]] = tagMatch[2];
    tagPositions.push({ start: tagMatch.index, end: tagMatch.index + tagMatch[0].length });
  }

  // Remove tags from the end (right-to-left to preserve indices)
  for (let i = tagPositions.length - 1; i >= 0; i--) {
    rest = rest.slice(0, tagPositions[i].start) + rest.slice(tagPositions[i].end);
  }
  rest = rest.trim();

  // Extract assignee: @name at start
  let assignee: string | undefined;
  const assigneeMatch = rest.match(/^@([\w-]+)\s+/);
  if (assigneeMatch) {
    assignee = assigneeMatch[1];
    rest = rest.slice(assigneeMatch[0].length);
  }

  const title = rest.trim();

  return { status, assignee, title, tags };
}

/**
 * Parses all task lines from a plan.md string.
 */
export function parsePlanTags(planMarkdown: string): ParsedTask[] {
  const tasks: ParsedTask[] = [];
  for (const line of planMarkdown.split('\n')) {
    const parsed = parseTaskLine(line);
    if (parsed) {
      tasks.push(parsed);
    }
  }
  return tasks;
}
