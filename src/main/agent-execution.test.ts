import { describe, it, expect } from 'vitest';
import { expandAgentCommand } from './agent-execution';
import type { ConductorTask } from '../shared/conductor';

describe('expandAgentCommand', () => {
  it('replaces {{task}} with single-quoted task title', () => {
    const task: ConductorTask = {
      title: 'Implement login',
      marker: '[ ]',
      status: 'todo',
      phase: 'Auth',
    };
    const template = 'agent run --prompt {{task}}';
    const result = expandAgentCommand(template, task);
    expect(result).toBe("agent run --prompt 'Implement login'");
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
    const template = 'agent run --prompt {{task}}';
    const result = expandAgentCommand(template, task);
    expect(result).toContain("'Implement login");
    expect(result).toContain("- [ ] Add form");
    expect(result).toContain("- [ ] Handle submit'");
  });

  it('removes agent tag from title when injecting into {{task}}', () => {
    const task: ConductorTask = {
      title: 'Implement login @gemini',
      marker: '[ ]',
      status: 'todo',
      phase: 'Auth',
    };
    const template = 'agent run --prompt {{task}}';
    const result = expandAgentCommand(template, task);
    expect(result).toBe("agent run --prompt 'Implement login'");
  });

  it('handles complex task title with single quotes and parentheses safely', () => {
    const title = "Conductor - User Manual Verification 'Phase 3: Final Integration & UX' (Protocol in workflow.md)";
    const task: ConductorTask = {
      title,
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
    const template = 'echo {{task}}';
    const result = expandAgentCommand(template, task);
    
    // Expected: wrapped in single quotes, inner single quotes escaped as '\''
    const escaped = title.replace(/'/g, "'\\''");
    expect(result).toBe(`echo '${escaped}'`);
  });

  it('handles templates that already have double quotes', () => {
    const task: ConductorTask = {
      title: 'Task (A)',
      marker: '[ ]',
      status: 'todo',
      phase: 'Phase 1',
    };
        const template = 'cmd "{{task}}"';
        const result = expandAgentCommand(template, task);
        // Becomes "'Task (A)'" inside the template's double quotes
        expect(result).toBe("cmd \"'Task (A)'\"");
      });
    });
    