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
import { registerPipelineRoutes } from './routes/pipelines';
import { registerOrchestratorRoutes } from './routes/orchestrator';
import { registerGitRoutes } from './routes/git';
import { registerCoverageRoutes } from './routes/coverage';

const convexClient = createConvexClient();
const realtimeClient = new ConvexClient(getConvexUrl());
const port = Number(process.env.PORT ?? '8081');

// ── WebSocket hub ──────────────────────────────────────────
const wsClients = new Map<string, Set<ServerWebSocket<undefined>>>();
const wsAllClients = new Set<ServerWebSocket<undefined>>();

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

registerProjectRoutes(router, convexClient);
registerIssueRoutes(router, convexClient);
registerLogRoutes(router, convexClient);
registerStatsRoutes(router, convexClient);
registerSprintRoutes(router, convexClient);
registerDependencyRoutes(router, convexClient);
registerAgentRoutes(router, convexClient);
registerHarnessRoutes(router, convexClient);
registerSettingsRoutes(router, convexClient);
registerPipelineRoutes(router);
registerOrchestratorRoutes(router, convexClient);
registerGitRoutes(router);
registerCoverageRoutes(router, convexClient);

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
      try {
        return await matched.handler(request, matched.params);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        console.error(`Error in ${request.method} ${url.pathname}:`, err);
        return json({ error: 'internal_server', message }, 500);
      }
    }

    return notFound();
  },
});

console.log(`Fleet Commander Bun server listening on http://localhost:${port}`);
