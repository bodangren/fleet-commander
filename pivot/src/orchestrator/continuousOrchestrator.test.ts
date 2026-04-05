import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { ContinuousOrchestrator } from './continuousOrchestrator';
import type { Task } from './types';

describe('ContinuousOrchestrator', () => {
  describe('idle detection', () => {
    it('detects idle when no tasks are available', async () => {
      const orchestrator = new ContinuousOrchestrator(async () => []);
      const isIdle = orchestrator.isIdle();
      expect(isIdle).toBe(true);
    });

    it('detects idle when all tasks are done or in_progress', async () => {
      const tasks: Task[] = [
        {
          projectSlug: 'p',
          trackId: 't',
          taskKey: 't1',
          title: 'Done task',
          status: 'done',
          dependencies: [],
          updatedAt: 0,
        },
        {
          projectSlug: 'p',
          trackId: 't',
          taskKey: 't2',
          title: 'In progress task',
          status: 'in_progress',
          dependencies: [],
          updatedAt: 0,
        },
      ];
      const orchestrator = new ContinuousOrchestrator(async () => tasks);
      const isIdle = orchestrator.isIdle();
      expect(isIdle).toBe(true);
    });

    it('detects not idle when tasks are todo', async () => {
      const tasks: Task[] = [
        {
          projectSlug: 'p',
          trackId: 't',
          taskKey: 't1',
          title: 'Todo task',
          status: 'todo',
          dependencies: [],
          updatedAt: 0,
        },
      ];
      const orchestrator = new ContinuousOrchestrator(async () => tasks);
      await orchestrator.runCycle();
      const isIdle = orchestrator.isIdle();
      expect(isIdle).toBe(false);
    });

    it('detects not idle when tasks are ready', async () => {
      const tasks: Task[] = [
        {
          projectSlug: 'p',
          trackId: 't',
          taskKey: 't1',
          title: 'Ready task',
          status: 'ready',
          dependencies: [],
          updatedAt: 0,
        },
      ];
      const orchestrator = new ContinuousOrchestrator(async () => tasks);
      await orchestrator.runCycle();
      const isIdle = orchestrator.isIdle();
      expect(isIdle).toBe(false);
    });

    it('detects not idle when tasks are blocked', async () => {
      const tasks: Task[] = [
        {
          projectSlug: 'p',
          trackId: 't',
          taskKey: 't1',
          title: 'Blocked task',
          status: 'blocked',
          dependencies: [],
          updatedAt: 0,
        },
      ];
      const orchestrator = new ContinuousOrchestrator(async () => tasks);
      await orchestrator.runCycle();
      const isIdle = orchestrator.isIdle();
      expect(isIdle).toBe(false);
    });
  });

  describe('cycle execution', () => {
    it('skips cycle when idle', async () => {
      const logMessages: string[] = [];
      const orchestrator = new ContinuousOrchestrator(
        async () => [],
        { log: (msg: string) => logMessages.push(msg) },
      );
      await orchestrator.runCycle();
      expect(logMessages.some((m) => m.includes('idle'))).toBe(true);
    });

    it('runs cycle when tasks are available', async () => {
      const tasks: Task[] = [
        {
          projectSlug: 'p',
          trackId: 't',
          taskKey: 't1',
          title: 'Todo task',
          status: 'todo',
          dependencies: [],
          updatedAt: 0,
        },
      ];
      const logMessages: string[] = [];
      let cycleRan = false;
      const orchestrator = new ContinuousOrchestrator(
        async () => tasks,
        { log: (msg: string) => logMessages.push(msg) },
        async () => { cycleRan = true; },
      );
      await orchestrator.runCycle();
      expect(cycleRan).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('starts and stops the loop', async () => {
      let callCount = 0;
      const orchestrator = new ContinuousOrchestrator(
        async () => {
          callCount++;
          return [];
        },
        { log: () => {} },
      );

      orchestrator.start(50);
      await new Promise((r) => setTimeout(r, 120));
      orchestrator.stop();

      expect(callCount).toBeGreaterThan(0);
      const countAfterStop = callCount;
      await new Promise((r) => setTimeout(r, 100));
      expect(callCount).toBe(countAfterStop);
    });
  });
});
