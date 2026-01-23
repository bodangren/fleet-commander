import { describe, it, expect } from 'vitest';
import { expandAgentCommand } from './agent-execution';
import type { ConductorTask } from '../shared/conductor';

describe('expandAgentCommand', () => {
  it('replaces {{task}} with task title', () => {
    const task: ConductorTask = {
      title: 'Implement login',
      marker: '[ ]',
      status: 'todo',
      phase: 'Auth',
    };
    const template = 'agent run --prompt "{{task}}"';
    const result = expandAgentCommand(template, task);
    expect(result).toBe('agent run --prompt "Implement login"');
  });

  it('includes sub-tasks in {{task}} replacement', () => {
    const task: ConductorTask = {
      title: 'Implement login',
      marker: '[ ]',
      status: 'todo',
      phase: 'Auth',
      subTasks: [
        { title: 'Add form', marker: '[ ]', status: 'todo' },
        { title: 'Handle submit', marker: '[ ]', status: 'todo' },
      ],
    };
    const template = 'agent run --prompt "{{task}}"';
    const result = expandAgentCommand(template, task);
    expect(result).toContain('Implement login');
    expect(result).toContain('- [ ] Add form');
    expect(result).toContain('- [ ] Handle submit');
  });

  it('removes agent tag from title when injecting into {{task}}', () => {
    const task: ConductorTask = {
      title: 'Implement login @gemini',
      marker: '[ ]',
      status: 'todo',
      phase: 'Auth',
    };
    const template = 'agent run --prompt "{{task}}"';
    const result = expandAgentCommand(template, task);
    expect(result).toBe('agent run --prompt "Implement login"');
  });

  it('handles empty sub-tasks gracefully', () => {
    const task: ConductorTask = {
      title: 'Task A',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
      subTasks: [],
    };
    const template = 'run {{task}}';
    const result = expandAgentCommand(template, task);
    expect(result).toBe('run "Task A"');
  });

  it('escapes double quotes in task title for shell usage', () => {
    const task: ConductorTask = {
      title: 'Implement "Login" Feature',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = 'agent run --prompt "{{task}}"';
    const result = expandAgentCommand(template, task);
    expect(result).toBe('agent run --prompt "Implement \\"Login\\" Feature"');
  });

  it('wraps unquoted placeholder in double quotes', () => {
    const task: ConductorTask = {
      title: 'Task (A)',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = 'echo {{task}}';
    const result = expandAgentCommand(template, task);
    expect(result).toBe('echo "Task (A)"');
  });

  it('preserves existing double quotes around placeholder', () => {
    const task: ConductorTask = {
      title: 'Task (A)',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = 'echo "{{task}}"';
    const result = expandAgentCommand(template, task);
    expect(result).toBe('echo "Task (A)"');
  });

  it('handles single quotes around placeholder correctly', () => {
    const task: ConductorTask = {
      title: "Task's (A)",
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = "echo '{{task}}'";
    const result = expandAgentCommand(template, task);
    expect(result).toBe("echo 'Task'\\''s (A)'");
  });
});
