import { describe, it, expect, afterEach } from 'bun:test';
import { existsSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { loadPipelines } from '../pipeline/loader.js';
import { runPipeline, type StepExecutor } from '../pipeline/runner.js';
import { type Pipeline } from '../pipeline/types.js';

const PIPELINES_PATH = join(process.cwd(), 'conductor', 'pipelines.yml');

function writePipelinesYaml(content: string): void {
  writeFileSync(PIPELINES_PATH, content, 'utf-8');
}

describe('Pipeline Integration', () => {
  afterEach(() => {
    if (existsSync(PIPELINES_PATH)) {
      rmSync(PIPELINES_PATH);
    }
  });

  it('loads a fixture YAML, triggers a pipeline, and asserts final status is succeeded', async () => {
    writePipelinesYaml(`pipelines:
  - name: integration-test
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo "build successful"
      - name: test
        steps:
          - name: unit
            command: echo "unit tests passed"
          - name: integration
            command: echo "integration tests passed"
            parallel: true
`);

    const loaded = await loadPipelines();
    expect(loaded.pipelines).toHaveLength(1);

    const pipeline = loaded.pipelines[0];
    expect(pipeline.name).toBe('integration-test');
    expect(pipeline.stages).toHaveLength(2);

    const executionOrder: string[] = [];
    const executor: StepExecutor = {
      execute: async (command: string) => {
        executionOrder.push(command);
        return { output: 'ok\n', exitCode: 0 };
      },
    };

    const execution = await runPipeline({ pipeline, executor });

    expect(execution.status).toBe('succeeded');
    expect(execution.stages).toHaveLength(2);
    expect(execution.stages[0].stageName).toBe('build');
    expect(execution.stages[0].status).toBe('succeeded');
    expect(execution.stages[1].stageName).toBe('test');
    expect(execution.stages[1].status).toBe('succeeded');
    expect(execution.stages[1].steps).toHaveLength(2);
  });

  it('fails pipeline when a step fails and stops subsequent stages', async () => {
    writePipelinesYaml(`pipelines:
  - name: fail-test
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo "build failed"
      - name: deploy
        steps:
          - name: deploy-prod
            command: echo "should not run"
`);

    const loaded = await loadPipelines();
    const pipeline = loaded.pipelines[0];

    const executor: StepExecutor = {
      execute: async (command: string) => {
        if (command.includes('build failed')) {
          return { output: 'error: build failed', exitCode: 1 };
        }
        return { output: 'ok\n', exitCode: 0 };
      },
    };

    const execution = await runPipeline({ pipeline, executor });

    expect(execution.status).toBe('failed');
    expect(execution.stages).toHaveLength(1);
    expect(execution.stages[0].stageName).toBe('build');
    expect(execution.stages[0].status).toBe('failed');
  });

  it('handles multi-stage pipeline with sequential and parallel steps', async () => {
    writePipelinesYaml(`pipelines:
  - name: full-pipeline
    trigger: both
    stages:
      - name: build
        steps:
          - name: compile
            command: echo compile
      - name: test
        steps:
          - name: unit
            command: echo unit
            parallel: true
          - name: lint
            command: echo lint
            parallel: true
      - name: deploy
        condition:
          when: DEPLOY_ENV
          equals: production
        steps:
          - name: deploy-prod
            command: echo deploy
`);

    const loaded = await loadPipelines();
    const pipeline = loaded.pipelines[0];

    const executor: StepExecutor = {
      execute: async () => ({ output: 'ok\n', exitCode: 0 }),
    };

    const execution = await runPipeline({
      pipeline,
      executor,
      envOverride: { DEPLOY_ENV: 'production' },
    });

    expect(execution.status).toBe('succeeded');
    expect(execution.stages).toHaveLength(3);
    expect(execution.stages[2].steps).toHaveLength(1);
  });
});
