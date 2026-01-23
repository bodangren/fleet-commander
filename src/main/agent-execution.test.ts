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
    expect(result).toBe("run 'Task A'");
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
    // Use regex to avoid escaping hell
    expect(result).toMatch(/Implement \\"Login\\" Feature/);
  });

  it('wraps unquoted placeholder in single quotes for safety', () => {
    const task: ConductorTask = {
      title: 'Task (A)',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = 'echo {{task}}';
    const result = expandAgentCommand(template, task);
    expect(result).toBe("echo 'Task (A)'");
  });

  it('handles assignment with quotes correctly', () => {
    const task: ConductorTask = {
      title: 'Task (A)',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = 'cmd="{{task}}"';
    const result = expandAgentCommand(template, task);
    expect(result).toBe('cmd="Task (A)"');
  });

  it('safely escapes shell execution characters in double quotes', () => {
    const task: ConductorTask = {
      title: 'Task $(ls) `whoami`',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = 'echo "{{task}}"';
    const result = expandAgentCommand(template, task);
    // Should escape $ and `
    expect(result).toBe('echo "Task \\$(ls) \\`whoami\\`"');
  });

  it('uses single quotes for unquoted placeholder to prevent expansion', () => {
    const task: ConductorTask = {
      title: 'Task $(ls)',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = 'echo {{task}}';
    const result = expandAgentCommand(template, task);
    // Should use single quotes
    expect(result).toBe("echo 'Task $(ls)'");
  });

  it('handles complex task title with single quotes and parentheses safely', () => {
    const title = "TestAgent: Conductor - User Manual Verification 'Phase 3: Final Integration & UX' (Protocol in workflow.md)";
    const task: ConductorTask = {
      title,
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = 'echo {{task}}';
    const result = expandAgentCommand(template, task);
    
    // Expected: wrapped in single quotes, inner single quotes escaped as '\''
    const expectedContent = title.replace(/'/g, "'\\''");
    expect(result).toBe(`echo '${expectedContent}'`);
  });
});
