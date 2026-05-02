import { Router, json, badRequest, notFound } from './router';
import { ConvexHttpClient } from 'convex/browser';
import {
  loadEnvironments,
  saveEnvironments,
  findEnvironment,
  addDeployment,
  type Environment,
} from '../environment/types';

export function registerEnvironmentRoutes(router: Router, _client: ConvexHttpClient): void {
  const projectRoot = process.cwd().replace(/\/pivot$/, '');

  router.get('/api/environments', () => {
    const envs = loadEnvironments(projectRoot);
    return json({ environments: envs.map(({ deployments, ...rest }) => rest) });
  });

  router.post('/api/environments', async (request) => {
    const body = await request.json().catch(() => null);
    if (!body?.name || !body?.targetUrl) {
      return badRequest('name and targetUrl are required');
    }
    const envs = loadEnvironments(projectRoot);
    if (findEnvironment(envs, body.name)) {
      return badRequest(`Environment '${body.name}' already exists`);
    }
    const newEnv: Environment = {
      name: body.name,
      targetUrl: body.targetUrl,
      deployScript: body.deployScript,
      variables: body.variables ?? [],
      status: 'inactive',
      deployments: [],
    };
    envs.push(newEnv);
    saveEnvironments(projectRoot, envs);
    return json({ environment: newEnv }, 201);
  });

  router.delete('/api/environments/:name', (_request, params) => {
    const name = params?.name as string;
    let envs = loadEnvironments(projectRoot);
    const idx = envs.findIndex((e) => e.name === name);
    if (idx === -1) return notFound('Environment not found');
    envs.splice(idx, 1);
    saveEnvironments(projectRoot, envs);
    return json({ ok: true });
  });

  router.post('/api/environments/:name/deploy', async (request, params) => {
    const name = params?.name as string;
    const body = await request.json().catch(() => null);
    const envs = loadEnvironments(projectRoot);
    const env = findEnvironment(envs, name);
    if (!env) return notFound('Environment not found');

    const record = addDeployment(env, body?.version ?? 'latest', body?.deployer ?? 'system');
    env.status = 'deploying';
    saveEnvironments(projectRoot, envs);

    // In a full implementation, this would trigger the pipeline runner
    // For now, mark as success immediately
    record.result = 'success';
    env.status = 'active';
    saveEnvironments(projectRoot, envs);

    return json({ deployment: record }, 201);
  });

  router.post('/api/environments/:name/rollback/:deployId', (_request, params) => {
    const name = params?.name as string;
    const deployId = params?.deployId as string;
    const envs = loadEnvironments(projectRoot);
    const env = findEnvironment(envs, name);
    if (!env) return notFound('Environment not found');

    const target = env.deployments.find((d) => d.id === deployId);
    if (!target) return notFound('Deployment not found');

    const record = addDeployment(env, target.version, 'rollback');
    record.result = 'success';
    env.status = 'active';
    saveEnvironments(projectRoot, envs);

    return json({ deployment: record }, 201);
  });
}
