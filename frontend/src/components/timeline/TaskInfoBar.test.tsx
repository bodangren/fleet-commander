import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskInfoBar } from './TaskInfoBar';

function makeTask(overrides = {}) {
  return {
    _id: 'task-1',
    projectId: 'proj-1',
    title: 'Test Task',
    description: 'Test desc',
    storyPoints: 5,
    status: 'in_progress',
    priority: 'high',
    costEstimate: 10,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeAgent(overrides = {}) {
  return {
    _id: 'agent-1',
    name: 'alice',
    role: 'Architect',
    skills: ['react'],
    model: 'claude',
    costPerPoint: 2,
    reliability: 0.9,
    status: 'active',
    workload: 1,
    maxWorkload: 3,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('TaskInfoBar', () => {
  it('renders task info with assignee', () => {
    const task = makeTask({ assigneeId: 'agent-1' });
    const agent = makeAgent({ _id: 'agent-1' });

    render(
      <TaskInfoBar
        task={task as any}
        agents={[agent as any]}
        sprint={null}
        project={null}
      />,
    );

    expect(screen.getByTestId('task-info-bar')).toBeDefined();
    expect(screen.getByText(/@alice/)).toBeDefined();
    expect(screen.getByText(/Architect/)).toBeDefined();
    expect(screen.getByText(/Priority: High/)).toBeDefined();
    expect(screen.getByTestId('task-status-badge')).toHaveTextContent('in progress');
  });

  it('renders unassigned when no assignee', () => {
    const task = makeTask();

    render(
      <TaskInfoBar
        task={task as any}
        agents={[]}
        sprint={null}
        project={null}
      />,
    );

    expect(screen.getByText(/Assignee: Unassigned/)).toBeDefined();
  });

  it('renders sprint and project names', () => {
    const task = makeTask();

    render(
      <TaskInfoBar
        task={task as any}
        agents={[]}
        sprint={{ _id: 'sprint-1', projectId: 'proj-1', name: 'Sprint 14' } as any}
        project={{ _id: 'proj-1', name: 'Fleet Commander' } as any}
      />,
    );

    expect(screen.getByText(/Sprint 14/)).toBeDefined();
    expect(screen.getByText(/Fleet Commander/)).toBeDefined();
  });

  it('renders correct badge color for done status', () => {
    const task = makeTask({ status: 'done' });

    render(
      <TaskInfoBar
        task={task as any}
        agents={[]}
        sprint={null}
        project={null}
      />,
    );

    expect(screen.getByTestId('task-status-badge')).toHaveTextContent('done');
  });

  it('renders correct badge color for blocked status', () => {
    const task = makeTask({ status: 'blocked' });

    render(
      <TaskInfoBar
        task={task as any}
        agents={[]}
        sprint={null}
        project={null}
      />,
    );

    expect(screen.getByTestId('task-status-badge')).toHaveTextContent('blocked');
  });
});
