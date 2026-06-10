import { z } from 'zod';
import { readdir, stat } from 'node:fs/promises';
import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest, noContent, routeBody } from './router';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { collectProjectImport } from '../sync/measureImporter';
import {
  buildStoryPrompt,
  parseGeneratedStories,
  estimateToPoints,
  priorityToTaskPriority,
  renderStoriesMarkdown,
  type GeneratedStory,
} from '../sync/storyGenerator';

/**
 * Runner that invokes the LLM to produce raw story-generator output.
 * Implementations can wrap the OpenCode SDK or be stubbed for tests.
 */
export type StoryGenerationRunner = (prompt: string) => Promise<string>;

/**
 * Build a deterministic, slug-shaped trackId from a human title.
 * Format: `<slug>_<yyyymmdd>`, matching existing measure/tracks/ naming.
 * @param title - Human-readable sprint/track title
 * @param now - Optional date; defaults to current date
 * @returns Track identifier suitable for the tracks table
 */
export function makeTrackId(title: string, now: Date = new Date()): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  const safe = slug.length > 0 ? slug : 'track';
  const y = now.getUTCFullYear().toString().padStart(4, '0');
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = now.getUTCDate().toString().padStart(2, '0');
  return `${safe}_${y}${m}${d}`;
}

/**
 * Extract the `## Goal` section body from a track's spec markdown.
 * Falls back to the spec title or a generic placeholder if no goal is found.
 * @param specMarkdown - Track spec markdown body
 * @returns Goal text suitable for prompt building
 */
export function extractGoalFromSpec(specMarkdown: string): string {
  const lines = specMarkdown.split('\n');
  const start = lines.findIndex((line) => /^##\s+Goal\s*$/i.test(line));
  if (start !== -1) {
    const body: string[] = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (/^##\s+/.test(lines[i])) break;
      body.push(lines[i]);
    }
    const text = body.join('\n').trim();
    if (text.length > 0) return text;
  }
  const titleLine = lines.find((line) => line.startsWith('# '));
  if (titleLine) return titleLine.replace(/^#\s+/, '').trim();
  return 'Define and ship the next sprint outcome.';
}

/**
 * Replace (or append) the `## Stories` section in a spec markdown body.
 * @param specMarkdown - Current spec markdown
 * @param storiesMarkdown - Rendered ## Stories block (output of renderStoriesMarkdown)
 * @returns Updated spec markdown with the Stories section reflecting storiesMarkdown
 */
export function mergeStoriesSection(specMarkdown: string, storiesMarkdown: string): string {
  const lines = specMarkdown.split('\n');
  const start = lines.findIndex((line) => /^##\s+Stories\s*$/i.test(line));
  if (start === -1) {
    const trimmed = specMarkdown.trimEnd();
    return `${trimmed}\n\n${storiesMarkdown.trim()}\n`;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const before = lines.slice(0, start).join('\n').trimEnd();
  const after = lines.slice(end).join('\n').trimStart();
  const body = storiesMarkdown.trim();
  return [before, '', body, '', after].filter((part) => part !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Registers project routes for health check, listing projects, and CRUD operations.
 * @param router - Bun Router instance
 * @param client - ConvexHttpClient instance
 * @param storyRunner - Optional LLM runner for story generation; when omitted, the
 *   generate routes return a 503 indicating the harness is unavailable.
 */
export function registerProjectRoutes(
  router: Router,
  client: ConvexHttpClient,
  storyRunner?: StoryGenerationRunner,
): void {
  router.get('/api/health', () => json({ status: 'ok', message: 'Fleet Commander is running.' }));

  router.get('/api/projects', async () => {
    const projects = await client.query(api.projects.listProjectsHandler, {});
    return json(projects.map((p) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      path: p.path,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })));
  });

  router.get('/api/projects/:id', async (_req, params) => {
    const project = await client.query(api.projects.getProjectHandler, {
      id: params.id as any,
    });
    if (!project) return notFound();
    return json({
      id: project._id,
      name: project.name,
      slug: project.slug,
      path: project.path,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  });

  router.delete('/api/projects/:id', async (_req, params) => {
    await client.mutation(api.projects.deleteProjectHandler, {
      id: params.id as any,
    });
    return json({ ok: true });
  });

  router.post('/api/projects', async (request) => {
    const parsed = await routeBody(
      z.object({
        name: z.string().min(1, 'name is required'),
        description: z.string().optional(),
        path: z.string().optional(),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { name, description, path } = parsed.data;

    const id = await client.mutation(api.projects.createProjectHandler, {
      name,
      description: description ?? '',
      path,
    });

    return json({ _id: id, name, description: description ?? '', path }, 201);
  });

  router.post('/api/projects/scan', async (request) => {
    const parsed = await routeBody(
      z.object({ rootDir: z.string().min(1, 'rootDir is required') }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const rootDir = parsed.data.rootDir.trim();

    try {
      const entries = await readdir(rootDir, { withFileTypes: true });
      const paths: string[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        try {
          const measureStat = await stat(`${rootDir}/${entry.name}/measure`);
          if (measureStat.isDirectory()) {
            paths.push(`${rootDir}/${entry.name}`);
          }
        } catch {
          // no measure/ directory — skip
        }
      }
      return json({ paths });
    } catch (err) {
      return json(
        { error: `Failed to scan: ${err instanceof Error ? err.message : 'Unknown'}` },
        500,
      );
    }
  });

  router.post('/api/projects/scan-and-import', async (request) => {
    const parsed = await routeBody(
      z.object({
        rootDir: z.string().optional(),
        paths: z.array(z.string()).optional(),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { rootDir, paths: inputPaths } = parsed.data;
    const paths = inputPaths ? [...inputPaths] : [];

    if (paths.length === 0 && rootDir) {
      // Scan first, then import everything found
      try {
        const entries = await readdir(rootDir.trim(), { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
          try {
            const measureStat = await stat(`${rootDir.trim()}/${entry.name}/measure`);
            if (measureStat.isDirectory()) {
              paths.push(`${rootDir.trim()}/${entry.name}`);
            }
          } catch {
            // skip
          }
        }
      } catch (err) {
        return json(
          { error: `Failed to scan: ${err instanceof Error ? err.message : 'Unknown'}` },
          500,
        );
      }
    }

    if (paths.length === 0) {
      return json({ projects: [], message: 'No measure workspaces found.' });
    }

    const results = [];
    for (const path of paths) {
      const imported = collectProjectImport(path);
      const name = imported.name;

      // Resolve or create the project by name (idempotent re-import).
      const existing = await client.query(api.projects.getProjectByNameHandler, { name });
      const projectId = existing
        ? existing._id
        : await client.mutation(api.projects.createProjectHandler, {
            name,
            description: `Imported from ${path}`,
            path,
          });

      let taskCount = 0;
      for (const track of imported.tracks) {
        await client.mutation(api.tracks.upsertTrackSnapshot, {
          projectSlug: name,
          projectId,
          trackId: track.trackId,
          title: track.snapshot.title,
          status: track.snapshot.status,
          specMarkdown: track.snapshot.specMarkdown,
          planMarkdown: track.snapshot.planMarkdown,
          expectedVersion: track.snapshot.expectedVersion ?? undefined,
        });

        for (const task of track.tasks) {
          await client.mutation(api.fleetCatalog.upsertTask, {
            projectSlug: name,
            trackId: track.trackId,
            taskKey: task.taskKey,
            title: task.title,
            description: task.title,
            status: task.status,
            priority: task.priority,
            storyPoints: task.storyPoints,
            dependencies: [],
          });
          taskCount++;
        }
      }

      results.push({
        _id: projectId,
        name,
        path,
        tracks: imported.tracks.length,
        tasks: taskCount,
      });
    }

    return json({ projects: results });
  });

  router.post('/api/projects/:id/tracks', async (request, params) => {
    const parsed = await routeBody(
      z.object({
        title: z.string().min(1, 'title is required'),
        goal: z.string().min(1, 'goal is required'),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { title, goal } = parsed.data;

    const project = await client.query(api.projects.getProjectHandler, {
      id: params.id as Id<'projects'>,
    });
    if (!project) return notFound();

    const trackId = makeTrackId(title);
    const snapshot = await client.mutation(api.tracks.createTrack, {
      projectSlug: project.slug,
      projectId: project._id,
      trackId,
      title,
      goal,
    });

    return json(
      {
        projectSlug: snapshot.projectSlug,
        trackId: snapshot.trackId,
        title: snapshot.title,
        status: snapshot.status,
        version: snapshot.version,
      },
      201,
    );
  });

  router.post('/api/projects/:id/tracks/:trackId/generate', async (request, params) => {
    const projectId = params.id;
    const trackId = params.trackId;
    if (!storyRunner) {
      return json(
        {
          error: 'Story generator harness is unavailable.',
          code: 'HARNESS_UNAVAILABLE',
        },
        503,
      );
    }

    const project = await client.query(api.projects.getProjectHandler, {
      id: projectId as Id<'projects'>,
    });
    if (!project) return notFound();

    const snapshot = await client.query(api.tracks.getTrackSnapshot, {
      projectSlug: project.slug,
      trackId,
    });
    if (!snapshot) return notFound();

    const parsed = await routeBody(z.object({ goal: z.string().optional() }), request);
    if (!parsed.ok) return parsed.response;
    const goal = parsed.data.goal?.trim() || extractGoalFromSpec(snapshot.specMarkdown);

    const prompt = buildStoryPrompt({
      goal,
      spec: snapshot.specMarkdown,
      projectContext: project.name,
    });

    let raw: string;
    try {
      raw = await storyRunner(prompt);
    } catch (err) {
      return json(
        {
          error: `Story generator failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          code: 'HARNESS_ERROR',
        },
        502,
      );
    }

    let stories: GeneratedStory[];
    try {
      stories = parseGeneratedStories(raw);
    } catch (err) {
      return json(
        {
          error: err instanceof Error ? err.message : 'Story generator output invalid',
          code: 'PARSE_ERROR',
        },
        502,
      );
    }

    return json({ projectSlug: project.slug, trackId, stories });
  });

  router.post('/api/projects/:id/tracks/:trackId/generate/commit', async (request, params) => {
    const projectId = params.id;
    const trackId = params.trackId;

    const parsed = await routeBody(
      z.object({
        stories: z
          .array(
            z.object({
              title: z.string().min(1),
              asA: z.string().min(1),
              iWant: z.string().min(1),
              soThat: z.string().min(1),
              acceptanceCriteria: z.array(z.string().min(1)).min(1),
              estimate: z.enum(['S', 'M', 'L', 'XL']),
              priority: z.enum(['Must', 'Should', 'Could']),
            }),
          )
          .min(1),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const stories = parsed.data.stories;

    const project = await client.query(api.projects.getProjectHandler, {
      id: projectId as Id<'projects'>,
    });
    if (!project) return notFound();

    const snapshot = await client.query(api.tracks.getTrackSnapshot, {
      projectSlug: project.slug,
      trackId,
    });
    if (!snapshot) return notFound();

    const storiesMarkdown = renderStoriesMarkdown(stories);
    const updatedSpec = mergeStoriesSection(snapshot.specMarkdown, storiesMarkdown);

    await client.mutation(api.tracks.upsertTrackSnapshot, {
      projectSlug: project.slug,
      projectId: project._id,
      trackId,
      title: snapshot.title,
      status: snapshot.status,
      specMarkdown: updatedSpec,
      planMarkdown: snapshot.planMarkdown,
      expectedVersion: snapshot.version,
    });

    let createdTasks = 0;
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      await client.mutation(api.fleetCatalog.upsertTask, {
        projectSlug: project.slug,
        trackId,
        taskKey: `${trackId}-story-${i + 1}`,
        title: story.title,
        description: `As a ${story.asA}\nI want ${story.iWant}\nSo that ${story.soThat}`,
        status: 'backlog',
        priority: priorityToTaskPriority(story.priority),
        storyPoints: estimateToPoints(story.estimate),
        dependencies: [],
      });
      createdTasks++;
    }

    return json({ projectSlug: project.slug, trackId, stories: stories.length, tasks: createdTasks }, 201);
  });

  router.put('/api/projects/:id/routing-policy', async (request, params) => {
    const parsed = await routeBody(
      z.object({
        policy: z.enum(['quality_first', 'cost_first', 'balanced', 'manual']),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;

    await client.mutation(api.projects.updateProjectRoutingPolicy, {
      id: params.id as any,
      policy: parsed.data.policy,
    });

    return json({ ok: true });
  });
}
