import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTaskTimeline } from './useTaskTimeline';

describe('useTaskTimeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null data when taskId is undefined', async () => {
    const { result } = renderHook(() => useTaskTimeline(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches timeline data successfully', async () => {
    const mockData = {
      task: {
        _id: 'task-1',
        projectId: 'proj-1',
        title: 'Test Task',
        description: 'Desc',
        storyPoints: 5,
        status: 'in_progress',
        priority: 'high',
        costEstimate: 10,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      pipelineRuns: [
        {
          _id: 'run-1',
          taskId: 'task-1',
          stage: 'architect',
          agentId: 'agent-1',
          startTime: 1000,
          endTime: 2000,
          cost: 1.5,
          status: 'completed',
          createdAt: Date.now(),
        },
      ],
      agents: [
        {
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
        },
      ],
      sprint: null,
      project: null,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockData }),
    } as Response);

    const { result } = renderHook(() => useTaskTimeline('task-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/tasks/task-1/timeline');
  });

  it('handles HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    const { result } = renderHook(() => useTaskTimeline('task-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Server error');
  });

  it('handles network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useTaskTimeline('task-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network failure');
  });

  it('refetch triggers new fetch', async () => {
    const mockData = {
      task: { _id: 'task-1', title: 'Test', storyPoints: 3, status: 'ready', priority: 'medium', costEstimate: 5, projectId: 'proj-1', description: '', createdAt: Date.now(), updatedAt: Date.now() },
      pipelineRuns: [],
      agents: [],
      sprint: null,
      project: null,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockData }),
    } as Response);

    const { result } = renderHook(() => useTaskTimeline('task-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await result.current.refresh();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
