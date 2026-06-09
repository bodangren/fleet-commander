import { describe, expect, it } from 'bun:test';
import {
  resolvePostExecutionStatus,
} from './resolveTransition';
import { scoreTask } from '../evaluator';
import { resolveDispatchStage, type Task } from '../types';

describe('Phase 3: Multi-stage pipeline', () => {
  describe('resolveDispatchStage', () => {
    const baseTask: Task = {
      projectSlug: 'proj',
      trackId: 'track1',
      taskKey: 'task1',
      title: 'Test task',
      status: 'ready',
      dependencies: [],
      updatedAt: 0,
    };

    it('returns executor for backlog tasks', () => {
      const result = resolveDispatchStage({ ...baseTask, status: 'backlog' });
      expect(result.stage).toBe('executor');
      expect(result.agentOverride).toBeUndefined();
    });

    it('returns executor for ready tasks', () => {
      const result = resolveDispatchStage({ ...baseTask, status: 'ready' });
      expect(result.stage).toBe('executor');
      expect(result.agentOverride).toBeUndefined();
    });

    it('returns reviewer for review task with reviewerId', () => {
      const result = resolveDispatchStage({
        ...baseTask,
        status: 'review',
        reviewerId: 'reviewer-agent',
      });
      expect(result.stage).toBe('reviewer');
      expect(result.agentOverride).toBe('reviewer-agent');
    });

    it('returns merger for review task where assignee matches mergerId', () => {
      const result = resolveDispatchStage({
        ...baseTask,
        status: 'review',
        assignee: 'merger-agent',
        mergerId: 'merger-agent',
      });
      expect(result.stage).toBe('merger');
      expect(result.agentOverride).toBe('merger-agent');
    });

    it('returns merger for review task with only mergerId (no reviewerId)', () => {
      const result = resolveDispatchStage({
        ...baseTask,
        status: 'review',
        mergerId: 'merger-agent',
      });
      expect(result.stage).toBe('merger');
      expect(result.agentOverride).toBe('merger-agent');
    });

    it('returns reviewer when both reviewerId and mergerId present but assignee does not match mergerId', () => {
      const result = resolveDispatchStage({
        ...baseTask,
        status: 'review',
        assignee: 'executor-agent',
        reviewerId: 'reviewer-agent',
        mergerId: 'merger-agent',
      });
      expect(result.stage).toBe('reviewer');
      expect(result.agentOverride).toBe('reviewer-agent');
    });

    it('returns merger when both reviewerId and mergerId present and assignee matches mergerId', () => {
      const result = resolveDispatchStage({
        ...baseTask,
        status: 'review',
        assignee: 'merger-agent',
        reviewerId: 'reviewer-agent',
        mergerId: 'merger-agent',
      });
      expect(result.stage).toBe('merger');
      expect(result.agentOverride).toBe('merger-agent');
    });

    it('returns executor for in_progress tasks', () => {
      const result = resolveDispatchStage({ ...baseTask, status: 'in_progress' });
      expect(result.stage).toBe('executor');
    });

    it('returns executor for done tasks', () => {
      const result = resolveDispatchStage({ ...baseTask, status: 'done' });
      expect(result.stage).toBe('executor');
    });

    it('returns executor for blocked tasks', () => {
      const result = resolveDispatchStage({ ...baseTask, status: 'blocked' });
      expect(result.stage).toBe('executor');
    });
  });

  describe('resolvePostExecutionStatus — multi-stage transitions', () => {
    it('returns review when reviewRequired is true', () => {
      const result = resolvePostExecutionStatus({
        succeeded: true,
        retriesExhausted: false,
        reviewRequired: true,
      });
      expect(result.nextStatus).toBe('review');
      expect(result.reason).toContain('review');
    });

    it('returns review when mergeRequired is true but reviewRequired is false', () => {
      const result = resolvePostExecutionStatus({
        succeeded: true,
        retriesExhausted: false,
        mergeRequired: true,
      });
      expect(result.nextStatus).toBe('review');
      expect(result.reason).toContain('merge');
    });

    it('returns review when both reviewRequired and mergeRequired are true (reviewRequired takes precedence)', () => {
      const result = resolvePostExecutionStatus({
        succeeded: true,
        retriesExhausted: false,
        reviewRequired: true,
        mergeRequired: true,
      });
      expect(result.nextStatus).toBe('review');
      expect(result.reason).toContain('review');
    });

    it('returns done when neither reviewRequired nor mergeRequired', () => {
      const result = resolvePostExecutionStatus({
        succeeded: true,
        retriesExhausted: false,
      });
      expect(result.nextStatus).toBe('done');
    });

    it('coverage violation still takes precedence over reviewRequired', () => {
      const result = resolvePostExecutionStatus({
        succeeded: true,
        retriesExhausted: false,
        coverageViolated: true,
        reviewRequired: true,
      });
      expect(result.nextStatus).toBe('blocked');
    });
  });

  describe('scoreTask — review status eligible', () => {
    it('returns 1 for review-status tasks (eligible for dispatch)', () => {
      const task: Task = {
        projectSlug: 'p',
        trackId: 't',
        taskKey: 't1',
        title: 'Review task',
        status: 'review',
        dependencies: [],
        updatedAt: 0,
      };
      expect(scoreTask(task)).toBe(1);
    });

    it('returns 2 for review-status tasks with priority:high', () => {
      const task: Task = {
        projectSlug: 'p',
        trackId: 't',
        taskKey: 't1',
        title: 'Review task priority:high',
        status: 'review',
        dependencies: [],
        updatedAt: 0,
      };
      expect(scoreTask(task)).toBe(2);
    });

    it('returns -1 for in_progress tasks (still ineligible)', () => {
      const task: Task = {
        projectSlug: 'p',
        trackId: 't',
        taskKey: 't1',
        title: 'In progress task',
        status: 'in_progress',
        dependencies: [],
        updatedAt: 0,
      };
      expect(scoreTask(task)).toBe(-1);
    });

    it('returns -1 for done tasks (still ineligible)', () => {
      const task: Task = {
        projectSlug: 'p',
        trackId: 't',
        taskKey: 't1',
        title: 'Done task',
        status: 'done',
        dependencies: [],
        updatedAt: 0,
      };
      expect(scoreTask(task)).toBe(-1);
    });
  });
});