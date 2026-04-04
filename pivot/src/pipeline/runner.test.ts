import { describe, it, expect } from 'bun:test';
import { runPipeline, BunStepExecutor, type StepExecutor } from './runner.js';
import { type Pipeline } from './types.js';

function createMockExecutor(results: Record<string, { output: string; exitCode: number }>): StepExecutor {
  return {
    execute: async (command: string) => {
      for (const [key, result] of Object.entries(results)) {
        if (command.includes(key)) {
          return result;
        }
      }
      return { output: '', exitCode: 0 };
    },
  };
}

describe('Pipeline Runner', () => {
  describe('sequential stages', () => {
    it('executes stages in order', async () => {
      const pipeline: Pipeline = {
        name: 'test-pipeline',
        trigger: 'manual',
        stages: [
          {
            name: 'build',
            steps: [{ name: 'compile', command: 'echo build', parallel: false, timeout: 30 }],
          },
          {
            name: 'test',
            steps: [{ name: 'unit', command: 'echo test', parallel: false, timeout: 30 }],
          },
        ],
      };

      const execution = await runPipeline({
        pipeline,
        executor: createMockExecutor({
          'echo build': { output: 'built\n', exitCode: 0 },
          'echo test': { output: 'passed\n', exitCode: 0 },
        }),
      });

      expect(execution.status).toBe('succeeded');
      expect(execution.stages).toHaveLength(2);
      expect(execution.stages[0].stageName).toBe('build');
      expect(execution.stages[1].stageName).toBe('test');
      expect(execution.stages[0].status).toBe('succeeded');
      expect(execution.stages[1].status).toBe('succeeded');
    });

    it('stops on stage failure', async () => {
      const pipeline: Pipeline = {
        name: 'fail-pipeline',
        trigger: 'manual',
        stages: [
          {
            name: 'build',
            steps: [{ name: 'compile', command: 'echo fail', parallel: false, timeout: 30 }],
          },
          {
            name: 'test',
            steps: [{ name: 'unit', command: 'echo test', parallel: false, timeout: 30 }],
          },
        ],
      };

      const execution = await runPipeline({
        pipeline,
        executor: createMockExecutor({
          'echo fail': { output: 'build failed', exitCode: 1 },
          'echo test': { output: 'never runs', exitCode: 0 },
        }),
      });

      expect(execution.status).toBe('failed');
      expect(execution.stages).toHaveLength(1);
      expect(execution.stages[0].status).toBe('failed');
    });
  });

  describe('parallel steps', () => {
    it('runs parallel steps concurrently', async () => {
      const pipeline: Pipeline = {
        name: 'parallel-pipeline',
        trigger: 'manual',
        stages: [
          {
            name: 'test',
            steps: [
              { name: 'unit', command: 'echo unit', parallel: true, timeout: 30 },
              { name: 'integration', command: 'echo integration', parallel: true, timeout: 30 },
            ],
          },
        ],
      };

      const execution = await runPipeline({
        pipeline,
        executor: createMockExecutor({
          'echo unit': { output: 'unit passed\n', exitCode: 0 },
          'echo integration': { output: 'integration passed\n', exitCode: 0 },
        }),
      });

      expect(execution.status).toBe('succeeded');
      expect(execution.stages[0].steps).toHaveLength(2);
    });

    it('fails stage if any parallel step fails', async () => {
      const pipeline: Pipeline = {
        name: 'parallel-fail',
        trigger: 'manual',
        stages: [
          {
            name: 'test',
            steps: [
              { name: 'unit', command: 'echo unit', parallel: true, timeout: 30 },
              { name: 'integration', command: 'echo integration', parallel: true, timeout: 30 },
            ],
          },
        ],
      };

      const execution = await runPipeline({
        pipeline,
        executor: createMockExecutor({
          'echo unit': { output: 'unit passed\n', exitCode: 0 },
          'echo integration': { output: 'integration failed', exitCode: 1 },
        }),
      });

      expect(execution.status).toBe('failed');
      expect(execution.stages[0].status).toBe('failed');
    });
  });

  describe('conditions', () => {
    it('skips stage when condition is not met', async () => {
      const pipeline: Pipeline = {
        name: 'conditional-pipeline',
        trigger: 'manual',
        stages: [
          {
            name: 'deploy',
            condition: { when: 'DEPLOY_ENV', equals: 'production' },
            steps: [{ name: 'deploy-prod', command: 'echo deploy', parallel: false, timeout: 30 }],
          },
        ],
      };

      const execution = await runPipeline({
        pipeline,
        executor: createMockExecutor({}),
        envOverride: { DEPLOY_ENV: 'staging' },
      });

      expect(execution.status).toBe('succeeded');
      expect(execution.stages[0].steps).toHaveLength(0);
    });

    it('runs stage when condition is met', async () => {
      const pipeline: Pipeline = {
        name: 'conditional-pipeline',
        trigger: 'manual',
        stages: [
          {
            name: 'deploy',
            condition: { when: 'DEPLOY_ENV', equals: 'production' },
            steps: [{ name: 'deploy-prod', command: 'echo deploy', parallel: false, timeout: 30 }],
          },
        ],
      };

      const execution = await runPipeline({
        pipeline,
        executor: createMockExecutor({
          'echo deploy': { output: 'deployed\n', exitCode: 0 },
        }),
        envOverride: { DEPLOY_ENV: 'production' },
      });

      expect(execution.status).toBe('succeeded');
      expect(execution.stages[0].steps).toHaveLength(1);
    });
  });

  describe('step dependencies', () => {
    it('respects depends_on ordering', async () => {
      const pipeline: Pipeline = {
        name: 'deps-pipeline',
        trigger: 'manual',
        stages: [
          {
            name: 'build',
            steps: [
              { name: 'second', command: 'echo second', depends_on: ['first'], parallel: false, timeout: 30 },
              { name: 'first', command: 'echo first', parallel: false, timeout: 30 },
            ],
          },
        ],
      };

      const executionOrder: string[] = [];
      const executor: StepExecutor = {
        execute: async (command: string) => {
          executionOrder.push(command);
          return { output: 'ok\n', exitCode: 0 };
        },
      };

      const execution = await runPipeline({ pipeline, executor });

      expect(execution.status).toBe('succeeded');
      expect(executionOrder).toEqual(['echo first', 'echo second']);
    });
  });

  describe('abort signal', () => {
    it('cancels execution when signal is aborted', async () => {
      const pipeline: Pipeline = {
        name: 'abort-pipeline',
        trigger: 'manual',
        stages: [
          {
            name: 'long',
            steps: [{ name: 'sleep', command: 'sleep 10', parallel: false, timeout: 30 }],
          },
        ],
      };

      const controller = new AbortController();
      const executor: StepExecutor = {
        execute: async (_command, _env, _timeout, signal) => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              resolve({ output: 'done', exitCode: 0 });
            }, 10000);
            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new Error('Aborted'));
            }, { once: true });
          });
        },
      };
      setTimeout(() => controller.abort(), 50);

      const execution = await runPipeline({
        pipeline,
        executor,
        signal: controller.signal,
      });

      expect(execution.status).toBe('failed');
    });
  });

  describe('execution metadata', () => {
    it('includes execution ID and metadata', async () => {
      const pipeline: Pipeline = {
        name: 'metadata-pipeline',
        trigger: 'task-complete',
        stages: [
          {
            name: 'build',
            steps: [{ name: 'compile', command: 'echo build', parallel: false, timeout: 30 }],
          },
        ],
      };

      const execution = await runPipeline({
        pipeline,
        executor: createMockExecutor({ 'echo build': { output: 'ok\n', exitCode: 0 } }),
        projectId: 'proj-123',
        triggeredBy: 'task-complete',
        triggeredByTaskId: 'task-456',
      });

      expect(execution.id).toBeDefined();
      expect(execution.pipelineName).toBe('metadata-pipeline');
      expect(execution.projectId).toBe('proj-123');
      expect(execution.triggeredBy).toBe('task-complete');
      expect(execution.triggeredByTaskId).toBe('task-456');
      expect(execution.startedAt).toBeDefined();
      expect(execution.completedAt).toBeDefined();
    });
  });
});
