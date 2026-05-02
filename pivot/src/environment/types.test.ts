import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadEnvironments,
  saveEnvironments,
  findEnvironment,
  addDeployment,
  type Environment,
} from './types';

const TEST_DIR = join(import.meta.dir, '.test-env-project');
const MEASURE_DIR = join(TEST_DIR, 'measure');

describe('environment types', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(MEASURE_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  test('loadEnvironments returns empty array when no file exists', () => {
    const envs = loadEnvironments(TEST_DIR);
    expect(envs).toEqual([]);
  });

  test('saveEnvironments and loadEnvironments round-trip', () => {
    const envs: Environment[] = [
      {
        name: 'staging',
        targetUrl: 'https://staging.example.com',
        deployScript: 'deploy.sh staging',
        variables: [{ key: 'NODE_ENV', value: 'staging' }],
        status: 'active',
        deployments: [],
      },
      {
        name: 'production',
        targetUrl: 'https://example.com',
        variables: [{ key: 'NODE_ENV', value: 'production', secret: true }],
        status: 'inactive',
        deployments: [],
      },
    ];

    saveEnvironments(TEST_DIR, envs);
    expect(existsSync(join(MEASURE_DIR, 'environments.yml'))).toBe(true);

    const loaded = loadEnvironments(TEST_DIR);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].name).toBe('staging');
    expect(loaded[0].targetUrl).toBe('https://staging.example.com');
    expect(loaded[0].variables).toHaveLength(1);
    expect(loaded[1].name).toBe('production');
    expect(loaded[1].variables[0].secret).toBe(true);
  });

  test('findEnvironment returns matching environment', () => {
    const envs: Environment[] = [
      { name: 'staging', targetUrl: '', variables: [], status: 'active', deployments: [] },
      { name: 'production', targetUrl: '', variables: [], status: 'inactive', deployments: [] },
    ];
    expect(findEnvironment(envs, 'staging')).toBeDefined();
    expect(findEnvironment(envs, 'staging')!.name).toBe('staging');
    expect(findEnvironment(envs, 'nonexistent')).toBeUndefined();
  });

  test('addDeployment creates record with correct fields', () => {
    const env: Environment = {
      name: 'staging',
      targetUrl: '',
      variables: [],
      status: 'active',
      deployments: [],
    };
    const record = addDeployment(env, 'v1.2.3', 'alice');
    expect(record.version).toBe('v1.2.3');
    expect(record.deployer).toBe('alice');
    expect(record.result).toBe('pending');
    expect(record.id).toBeTruthy();
    expect(env.deployments).toHaveLength(1);
    expect(env.lastDeploy).toBe(record);
  });
});
