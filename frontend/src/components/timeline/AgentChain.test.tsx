import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentChain } from './AgentChain';

function makeRun(overrides = {}) {
  return {
    _id: 'run-1',
    taskId: 'task-1',
    stage: 'architect',
    agentId: 'agent-1',
    startTime: 1000,
    endTime: 2000,
    cost: 1.5,
    status: 'completed',
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeAgent(overrides = {}) {
  return {
    _id: 'agent-1',
    name: 'alice',
    role: 'architect',
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

describe('AgentChain', () => {
  it('renders all 5 stage cards', () => {
    render(<AgentChain pipelineRuns={[]} agents={[]} />);

    expect(screen.getByTestId('agent-chain')).toBeDefined();
    expect(screen.getByTestId('agent-chain-card-dispatch')).toBeDefined();
    expect(screen.getByTestId('agent-chain-card-architect')).toBeDefined();
    expect(screen.getByTestId('agent-chain-card-executor')).toBeDefined();
    expect(screen.getByTestId('agent-chain-card-reviewer')).toBeDefined();
    expect(screen.getByTestId('agent-chain-card-merger')).toBeDefined();
  });

  it('shows done card with green border for completed stage', () => {
    const run = makeRun({ stage: 'architect', status: 'completed' });
    const agent = makeAgent();

    render(<AgentChain pipelineRuns={[run as any]} agents={[agent as any]} />);

    const card = screen.getByTestId('agent-chain-card-architect');
    expect(card.style.borderColor).toBe('rgb(39, 166, 68)');
  });

  it('shows active card with blue border for running stage', () => {
    const run = makeRun({ stage: 'executor', status: 'running' });
    const agent = makeAgent({ _id: 'agent-2', name: 'bob' });

    render(<AgentChain pipelineRuns={[run as any]} agents={[agent as any]} />);

    const card = screen.getByTestId('agent-chain-card-executor');
    expect(card.style.borderColor).toBe('rgb(94, 106, 210)');
  });

  it('shows pending card with reduced opacity', () => {
    render(<AgentChain pipelineRuns={[]} agents={[]} />);

    const card = screen.getByTestId('agent-chain-card-merger');
    expect(card.style.opacity).toBe('0.5');
  });

  it('displays agent initials', () => {
    const run = makeRun({ stage: 'architect', agentId: 'agent-1' });
    const agent = makeAgent({ _id: 'agent-1', name: 'Alice Smith' });

    render(<AgentChain pipelineRuns={[run as any]} agents={[agent as any]} />);

    expect(screen.getByTestId('agent-chain-card-architect').textContent).toContain('AS');
  });

  it('displays Sys for dispatch with no agent', () => {
    render(<AgentChain pipelineRuns={[]} agents={[]} />);

    expect(screen.getByTestId('agent-chain-card-dispatch').textContent).toContain('Sys');
  });
});
