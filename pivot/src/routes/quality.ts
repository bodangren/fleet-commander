import { ConvexHttpClient } from 'convex/browser';
import { Router, json, badRequest } from './router';
import { api } from '../../../convex/_generated/api';

/**
 * Registers quality profile and quality operations routes for the frontend
 * settings surface, task timeline, and operations panel.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerQualityRoutes(router: Router, client: ConvexHttpClient): void {
  router.get('/api/quality/profiles', async () => {
    try {
      const profiles = await client.query(api.qualityProfiles.listProfiles, {} as any);
      return json(profiles);
    } catch {
      return json({ error: 'Convex unavailable' }, 500);
    }
  });

  router.get('/api/quality/projects/:projectSlug/profile', async (_request, params) => {
    try {
      const result = await client.query(api.qualityProfiles.getEffectiveProjectProfile, {
        projectSlug: params.projectSlug,
      } as any);
      return json(result);
    } catch {
      return json({ error: 'Convex unavailable' }, 500);
    }
  });

  router.get('/api/quality/projects/:projectSlug/tasks/:taskKey/profile', async (_request, params) => {
    try {
      const result = await client.query(api.qualityProfiles.getEffectiveTaskProfile, {
        projectSlug: params.projectSlug,
        taskKey: params.taskKey,
      } as any);
      return json(result);
    } catch {
      return json({ error: 'Convex unavailable' }, 500);
    }
  });

  router.post('/api/quality/projects/:projectSlug/select', async (request, params) => {
    try {
      const body = (await request.json()) as {
        profileName?: string;
        profileVersion?: number;
        actor?: string;
      };
      if (!body.profileName || !body.profileVersion) {
        return badRequest('profileName and profileVersion are required');
      }
      const result = await client.mutation(api.qualityProfiles.selectProjectProfile, {
        selection: {
          projectSlug: params.projectSlug,
          profileName: body.profileName,
          profileVersion: body.profileVersion,
          actor: body.actor ?? 'ui',
        },
        now: Date.now(),
      } as any);
      return json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return json({ error: msg }, 422);
    }
  });

  router.post('/api/quality/profiles/publish', async (request) => {
    try {
      const body = (await request.json()) as {
        profile?: unknown;
        actor?: string;
      };
      if (!body.profile) return badRequest('profile is required');
      const result = await client.mutation(api.qualityProfiles.publishProfileVersion, {
        profile: body.profile,
        actor: body.actor ?? 'ui',
        now: Date.now(),
      } as any);
      return json({ ok: true, profile: result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return json({ error: msg }, 422);
    }
  });

  router.post('/api/quality/profiles/disable', async (request) => {
    try {
      const body = (await request.json().catch(() => ({}))) as { projectSlug?: string; reason?: string };
      const projectSlug = body.projectSlug;
      if (!projectSlug) {
        return badRequest('projectSlug is required');
      }
      await client.mutation(api.qualityProfiles.selectProjectProfile, {
        selection: {
          projectSlug,
          profileName: 'none',
          profileVersion: 1,
          actor: 'ui-disable',
        },
        now: Date.now(),
      } as any);
      return json({ ok: true, projectSlug, disabled: true, reason: body.reason });
    } catch {
      return json({ error: 'Disable failed' }, 500);
    }
  });

  router.get('/api/quality/runs', async (request) => {
    try {
      const url = new URL(request.url);
      const statusParam = url.searchParams.get('status') ?? '';
      const statuses = statusParam.split(',').filter(Boolean);

      const runs = await client.query(api.qualityRuns.listQualityRunsByStatus, {
        statuses: statuses as any,
      } as any);
      return json(runs);
    } catch {
      return json({ error: 'Convex unavailable' }, 500);
    }
  });

  router.post('/api/quality/runs/:runId/retry', async (request, params) => {
    try {
      const body = (await request.json().catch(() => ({}))) as { stageKind?: string; reason?: string };
      if (!body.stageKind) {
        return badRequest('stageKind is required');
      }
      const result = await client.mutation(api.qualityRuns.retryStageAttempt, {
        runId: params.runId,
        stageKind: body.stageKind,
        role: 'executor',
        startedAt: Date.now(),
        now: Date.now(),
      } as any);
      return json({ ok: true, runId: params.runId, result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Retry failed';
      return json({ error: msg }, 500);
    }
  });

  router.post('/api/quality/projects/select', async (request) => {
    try {
      const body = (await request.json()) as {
        profileName?: string;
        profileVersion?: number;
        projectSlug?: string;
        reason?: string;
      };
      if (!body.projectSlug) {
        return badRequest('projectSlug is required');
      }
      const result = await client.mutation(api.qualityProfiles.selectProjectProfile, {
        selection: {
          projectSlug: body.projectSlug,
          profileName: body.profileName ?? 'none',
          profileVersion: body.profileVersion ?? 1,
          actor: 'ui-ops',
        },
        now: Date.now(),
      } as any);
      return json({
        ok: true,
        projectSlug: body.projectSlug,
        profileName: body.profileName ?? 'none',
        profileVersion: body.profileVersion ?? 1,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Profile change failed';
      return json({ error: msg }, 500);
    }
  });
}
