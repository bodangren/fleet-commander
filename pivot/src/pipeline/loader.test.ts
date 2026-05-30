import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadPipelines, PipelineLoadError } from './loader.js';
import { parseYaml } from './loader.js';

const TEST_DIR = join(process.cwd(), 'test-fixtures-pipeline');

/**
 * Writes test fixture pipeline YAML file to temp directory.
 */
function writeFixture(filename: string, content: string): string {
  const path = join(TEST_DIR, filename);
  writeFileSync(path, content, 'utf-8');
  return path;
}

describe('Pipeline Loader', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('parseYaml', () => {
    it('parses a simple pipeline definition', () => {
      const yaml = `
pipelines:
  - name: build-and-test
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: bun run build
          - name: lint
            command: bun run lint
`;
      const result = parseYaml(yaml);
      expect(result).toHaveProperty('pipelines');
      const pipelines = (result as Record<string, unknown>).pipelines as Array<Record<string, unknown>>;
      expect(pipelines).toHaveLength(1);
      expect(pipelines[0].name).toBe('build-and-test');
    });

    it('parses pipeline with parallel steps', () => {
      const yaml = `
pipelines:
  - name: parallel-test
    stages:
      - name: test
        steps:
          - name: unit
            command: bun test:unit
            parallel: true
          - name: integration
            command: bun test:integration
            parallel: true
`;
      const result = parseYaml(yaml);
      const pipelines = (result as Record<string, unknown>).pipelines as Array<Record<string, unknown>>;
      const steps = (pipelines[0].stages as Array<Record<string, unknown>>)[0].steps as Array<Record<string, unknown>>;
      expect(steps).toHaveLength(2);
      expect(steps[0].parallel).toBe(true);
    });

    it('parses pipeline with conditions', () => {
      const yaml = `
pipelines:
  - name: conditional
    stages:
      - name: deploy
        condition:
          when: env
          equals: production
        steps:
          - name: deploy-prod
            command: bun run deploy
`;
      const result = parseYaml(yaml);
      const pipelines = (result as Record<string, unknown>).pipelines as Array<Record<string, unknown>>;
      const stage = (pipelines[0].stages as Array<Record<string, unknown>>)[0];
      expect(stage.condition).toBeDefined();
    });

    it('parses pipeline with env and secrets', () => {
      const yaml = `
pipelines:
  - name: with-secrets
    stages:
      - name: build
        steps:
          - name: build-step
            command: bun run build
            env:
              NODE_ENV: production
            secrets:
              - API_KEY
              - DB_PASSWORD
`;
      const result = parseYaml(yaml);
      const pipelines = (result as Record<string, unknown>).pipelines as Array<Record<string, unknown>>;
      const step = ((pipelines[0].stages as Array<Record<string, unknown>>)[0].steps as Array<Record<string, unknown>>)[0];
      expect(step.env).toEqual({ NODE_ENV: 'production' });
      expect(step.secrets).toEqual(['API_KEY', 'DB_PASSWORD']);
    });
  });

  describe('loadPipelines', () => {
    it('loads a valid pipeline file', async () => {
      const yaml = `pipelines:
  - name: test-pipeline
    trigger: manual
    stages:
      - name: build
        steps:
          - name: compile
            command: echo build
`;
      const path = writeFixture('valid.yml', yaml);
      const result = await loadPipelines(path);
      expect(result.pipelines).toHaveLength(1);
      expect(result.pipelines[0].name).toBe('test-pipeline');
    });

    it('throws when file does not exist', async () => {
      await expect(loadPipelines('/nonexistent/path.yml')).rejects.toThrow(PipelineLoadError);
    });

    it('throws on duplicate pipeline names', async () => {
      const yaml = `pipelines:
  - name: duplicate
    stages:
      - name: build
        steps:
          - name: compile
            command: echo build
  - name: duplicate
    stages:
      - name: test
        steps:
          - name: unit
            command: echo test
`;
      const path = writeFixture('duplicate.yml', yaml);
      await expect(loadPipelines(path)).rejects.toThrow(/Duplicate pipeline name/);
    });

    it('throws on empty stages', async () => {
      const yaml = `pipelines:
  - name: no-stages
    stages: []
`;
      const path = writeFixture('empty-stages.yml', yaml);
      await expect(loadPipelines(path)).rejects.toThrow(/at least one stage/);
    });

    it('throws on missing step name', async () => {
      const yaml = `pipelines:
  - name: bad-step
    stages:
      - name: build
        steps:
          - command: echo missing-name
`;
      const path = writeFixture('missing-step-name.yml', yaml);
      await expect(loadPipelines(path)).rejects.toThrow(/expected string, received undefined/);
    });

    it('throws on invalid dependency', async () => {
      const yaml = `pipelines:
  - name: bad-deps
    stages:
      - name: build
        steps:
          - name: step-a
            command: echo a
            depends_on:
              - nonexistent-step
`;
      const path = writeFixture('bad-deps.yml', yaml);
      await expect(loadPipelines(path)).rejects.toThrow(/Invalid dependency/);
    });

    it('parses multi-stage pipeline with sequential stages', async () => {
      const yaml = `pipelines:
  - name: full-pipeline
    trigger: both
    stages:
      - name: build
        steps:
          - name: compile
            command: bun run build
      - name: test
        steps:
          - name: unit
            command: bun test:unit
          - name: integration
            command: bun test:integration
      - name: deploy
        condition:
          when: env
          equals: production
        steps:
          - name: deploy-prod
            command: bun run deploy
`;
      const path = writeFixture('multi-stage.yml', yaml);
      const result = await loadPipelines(path);
      expect(result.pipelines).toHaveLength(1);
      expect(result.pipelines[0].stages).toHaveLength(3);
      expect(result.pipelines[0].trigger).toBe('both');
    });
  });
});
