import type { Server, ServerWebSocket } from 'bun';
import { ConvexClient } from 'convex/browser';
import { createConvexClient, getConvexUrl } from './convexClient';
import { Router, json, notFound } from './routes/router';
import { registerProjectRoutes } from './routes/projects';
import { registerIssueRoutes } from './routes/issues';
import { registerLogRoutes } from './routes/logs';
import { registerStatsRoutes } from './routes/stats';
import { registerSprintRoutes } from './routes/sprints';
import { registerDependencyRoutes } from './routes/dependencies';
import { registerAgentRoutes } from './routes/agents';
import { registerHarnessRoutes } from './routes/harnesses';
import { registerSettingsRoutes } from './routes/settings';
import { registerReconciliationRoutes } from './routes/reconciliation';
import { registerOrchestratorRoutes } from './routes/orchestrator';
import { registerGitRoutes } from './routes/git';
import { registerCoverageRoutes } from './routes/coverage';
import { registerPRRoutes } from './routes/pr';
import { registerEnvironmentRoutes } from './routes/environments';
import { registerAnalysisRoutes } from './routes/analysis';
import { registerAnalyticsRoutes } from './routes/analytics';
import { registerCostRoutes } from './routes/costs';
import { registerPerformanceRoutes } from './routes/performance';
import { registerRetrospectiveRoutes } from './routes/retrospectives';
import { registerNotificationRoutes } from './routes/notifications';
import { registerFleetRoutes } from './routes/fleet';
import { registerPipelineEngineRoutes } from './routes/pipelineEngine';
import { registerSprintPlanningRoutes } from './routes/sprintPlanning';
import { registerKanbanRoutes } from './routes/kanban';
import { registerTaskTimelineRoutes } from './routes/taskTimeline';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerAgentTemplateRoutes } from './routes/agentTemplates';
import { registerQualityRoutes } from './routes/quality';
import { PolicyStatsScheduler } from './policy/scheduler';
import { RetrospectiveScheduler } from './retrospective/scheduler';
import { AutoRunner, readIntervalMs, isContinuousModeEnabled } from './orchestrator/autoRunner';
import { createAutoPushGitHooks } from './orchestrator/gitOrchestrator';
import { createProductionQualityWorkflowHooks } from './orchestrator/productionQualityWorkflowHooks';
import { config } from './config';
import { initOpencodeServer, closeOpencodeServer } from './orchestrator/opencodeServer';
import { createOpencodeStoryRunner } from './sync/opencodeStoryRunner';
import type { StoryGenerationRunner } from './routes/projects';

const convexClient = createConvexClient();
const realtimeClient = new ConvexClient(getConvexUrl());
const port = Number(process.env.PORT ?? '8081');

// ── OpenCode SDK server ────────────────────────────────────
// The SDK spawns a child process that may throw from an exit handler
// even after the promise rejects. Suppress that specific unhandled rejection.
/**
 * Suppress specific unhandled rejection from OpenCode SDK server exit.
 * @param reason - The rejection reason
 */
const suppressOpencodeRejection = (reason: unknown) => {
  if (reason instanceof Error && reason.message.includes('Server exited with code')) {
    return; // expected when port is in use
  }
};
process.on('unhandledRejection', suppressOpencodeRejection);
let storyRunner: StoryGenerationRunner | undefined;
try {
  await initOpencodeServer();
  storyRunner = createOpencodeStoryRunner();
} catch {
  console.warn('[opencode] Server init failed (port in use?). Orchestrator AI features disabled.');
} finally {
  process.removeListener('unhandledRejection', suppressOpencodeRejection);
}

// ── WebSocket hub ──────────────────────────────────────────
const wsClients = new Map<string, Set<ServerWebSocket<undefined>>>();
const wsAllClients = new Set<ServerWebSocket<undefined>>();

/**
 * Broadcast a JSON message to all WebSocket clients subscribed to a project channel.
 * @param projectSlug - The project identifier
 * @param data - The data to broadcast
 */
function broadcastToProject(projectSlug: string, data: unknown) {
  const clients = wsClients.get(projectSlug);
  if (!clients) return;
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// ── Route registration ─────────────────────────────────────
const router = new Router();

registerProjectRoutes(router, convexClient, storyRunner);
registerIssueRoutes(router, convexClient);
registerLogRoutes(router, convexClient);
registerStatsRoutes(router, convexClient);
registerSprintRoutes(router, convexClient);
registerDependencyRoutes(router, convexClient);
registerFleetRoutes(router, convexClient);
registerAgentRoutes(router, convexClient);
registerHarnessRoutes(router, convexClient);
registerSettingsRoutes(router, convexClient);
registerReconciliationRoutes(router, convexClient);
registerOrchestratorRoutes(router, convexClient);
registerGitRoutes(router, convexClient);
registerCoverageRoutes(router, convexClient);
registerPRRoutes(router, convexClient);
registerEnvironmentRoutes(router, convexClient);
registerAnalysisRoutes(router, convexClient);
registerAnalyticsRoutes(router, convexClient);
registerCostRoutes(router, convexClient);
registerPerformanceRoutes(router, convexClient);
registerRetrospectiveRoutes(router, convexClient);
registerNotificationRoutes(router, convexClient);
registerPipelineEngineRoutes(router);
registerSprintPlanningRoutes(router, convexClient);
registerKanbanRoutes(router, convexClient);
registerTaskTimelineRoutes(router, convexClient);
registerDashboardRoutes(router, convexClient);
registerAgentTemplateRoutes(router, convexClient);
registerQualityRoutes(router, convexClient);

// ── Background schedulers ──────────────────────────────────
const policyStatsScheduler = new PolicyStatsScheduler(convexClient);
policyStatsScheduler.start();

const retrospectiveScheduler = new RetrospectiveScheduler(convexClient);
retrospectiveScheduler.start();

// AutoRunner: dispatches orchestrator cycles for every active project on the
// configured interval. Each tick consults `continuousMode.getContinuousModeStatus`
// — when the UI toggle is off, the tick is skipped without stopping the timer
// so flipping the toggle back on resumes work without a restart.
let cachedIntervalMs = 30_000;
void readIntervalMs().then((ms) => { cachedIntervalMs = ms > 0 ? ms : 30_000; });
const autoRunner = new AutoRunner(
  () => {
    void readIntervalMs().then((ms) => { cachedIntervalMs = ms > 0 ? ms : 30_000; });
    return cachedIntervalMs;
  },
  undefined,
  {
    isEnabled: () => isContinuousModeEnabled(convexClient),
    gitHooks: createAutoPushGitHooks(config.git.autoPush),
    qualityWorkflowHooks: createProductionQualityWorkflowHooks(),
  },
);
autoRunner.start();

// ── SSE stream for projects ────────────────────────────────
router.get('/api/projects/stream', () => {
  let cleanup: (() => void) | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = (realtimeClient as any).onUpdate(
        'projects:listProjects',
        {},
        (rows: unknown) => {
          controller.enqueue(`data: ${JSON.stringify(rows)}\n\n`);
        },
      );

      const heartbeat = setInterval(() => {
        controller.enqueue(': heartbeat\n\n');
      }, 15000);

      cleanup = () => {
        clearInterval(heartbeat);
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    },
    cancel() {
      if (typeof cleanup === 'function') cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
});

// ── Static HTML for root ───────────────────────────────────
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Fleet Commander</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; background: #f5f7fb; color: #0f172a; }
      h1 { margin-top: 0; }
      code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Fleet Commander — Bun + Convex</h1>
    <p>Server is running on port <code>${port}</code>.</p>
    <p>API endpoints available at <code>/api/*</code>.</p>
  </body>
</html>`;

// ── Server ─────────────────────────────────────────────────
Bun.serve({
  port,
  websocket: {
    open(ws: ServerWebSocket<undefined>) {
      wsAllClients.add(ws);
    },
    message(ws: ServerWebSocket<undefined>, raw: string | Buffer) {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'subscribe' && msg.projectSlug) {
          if (!wsClients.has(msg.projectSlug)) wsClients.set(msg.projectSlug, new Set());
          wsClients.get(msg.projectSlug)!.add(ws);
          ws.subscribe(msg.projectSlug);
        }
      } catch {
        // ignore malformed messages
      }
    },
    close(ws: ServerWebSocket<undefined>) {
      wsAllClients.delete(ws);
      for (const [slug, clients] of wsClients) {
        clients.delete(ws);
        if (clients.size === 0) {
          wsClients.delete(slug);
        }
      }
    },
  },
  async fetch(request: Request, server: Server<undefined>): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'content-type',
        },
      });
    }

    // WebSocket upgrade for /api/projects/:slug/ws
    const wsMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/ws$/);
    if (wsMatch && server.upgrade(request)) {
      return new Response(null, { status: 101 });
    }

    // Root HTML
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    // Route matching
    const matched = router.match(request.method, url.pathname);
    if (matched) {
      const startMs = Date.now();
      try {
        const response = await matched.handler(request, matched.params);
        const durationMs = Date.now() - startMs;
        if (url.pathname !== '/api/health' && url.pathname !== '/api/orchestrator/health') {
          const level = durationMs > 5000 ? 'warn' : 'debug';
          console[level](`[${request.method}] ${url.pathname} ${response.status} ${durationMs}ms`);
        }
        return response;
      } catch (err: unknown) {
        const durationMs = Date.now() - startMs;
        const message = err instanceof Error ? err.message : 'Internal server error';
        console.error(`[${request.method}] ${url.pathname} 500 ${durationMs}ms: ${message}`);
        return json({ error: 'internal_server', message }, 500);
      }
    }

    return notFound();
  },
});

/**
 * Gracefully shut down the Bun server, stopping schedulers and closing clients.
 */
function shutdown() {
  console.log('Shutting down gracefully...');
  closeOpencodeServer();
  policyStatsScheduler.stop();
  retrospectiveScheduler.stop();
  autoRunner.stop();
  realtimeClient.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`Fleet Commander Bun server listening on http://localhost:${port}`);
