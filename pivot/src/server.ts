import { ConvexClient } from 'convex/browser';
import { createConvexClient, getConvexUrl } from './convexClient';
import type { ProjectDto, UpsertProjectInput } from './types';

const realtimeClient = new ConvexClient(getConvexUrl());
const port = Number(process.env.PORT ?? '8787');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Fleet Commander Bun + Convex Slice</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; background: #f5f7fb; color: #0f172a; }
      h1 { margin-top: 0; }
      form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
      input { padding: 8px; min-width: 220px; border: 1px solid #cbd5e1; border-radius: 8px; }
      button { padding: 8px 12px; border: none; border-radius: 8px; background: #0f172a; color: white; }
      ul { list-style: none; padding: 0; }
      li { background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; padding: 10px; }
      .path { color: #475569; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Project Registry Vertical Slice</h1>
    <p>This page reads/writes state via Bun API endpoints backed by Convex functions.</p>
    <form id="project-form">
      <input id="slug" placeholder="slug" required />
      <input id="name" placeholder="display name" required />
      <input id="path" placeholder="/absolute/path" required />
      <button type="submit">Upsert Project</button>
    </form>
    <ul id="projects"></ul>
    <script type="module">
      const projectsEl = document.getElementById('projects');
      const formEl = document.getElementById('project-form');
      const slugEl = document.getElementById('slug');
      const nameEl = document.getElementById('name');
      const pathEl = document.getElementById('path');

      function renderProjects(data) {
        projectsEl.innerHTML = data.map((project) => \`
          <li>
            <div><strong>\${project.name}</strong> (\${project.slug})</div>
            <div class="path">\${project.rootPath}</div>
            <div class="path">status=\${project.status} source=\${project.source}</div>
          </li>
        \`).join('');
      }

      async function loadProjects() {
        const response = await fetch('/api/projects');
        renderProjects(await response.json());
      }

      const source = new EventSource('/api/projects/stream');
      source.onmessage = (event) => {
        const next = JSON.parse(event.data);
        renderProjects(next);
      }

      formEl.addEventListener('submit', async (event) => {
        event.preventDefault();
        await fetch('/api/projects', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            slug: slugEl.value.trim(),
            name: nameEl.value.trim(),
            rootPath: pathEl.value.trim(),
            status: 'active',
            source: 'manual'
          })
        });
        formEl.reset();
        await loadProjects();
      });

      loadProjects();
    </script>
  </body>
</html>`;

async function listProjects(): Promise<ProjectDto[]> {
  const client = createConvexClient();
  return client.query('projects:listProjects' as never, {});
}

async function upsertProject(input: UpsertProjectInput): Promise<ProjectDto> {
  const client = createConvexClient();
  return client.mutation('projects:upsertProject' as never, input as never);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function projectStream(): Response {
  let cleanup: (() => void) | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = (realtimeClient as any).onUpdate(
        'projects:listProjects',
        {},
        (rows: ProjectDto[]) => {
          controller.enqueue(`data: ${JSON.stringify(rows)}\n\n`);
        },
      );

      const heartbeat = setInterval(() => {
        controller.enqueue(': heartbeat\n\n');
      }, 15000);

      cleanup = () => {
        clearInterval(heartbeat);
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    },
    cancel() {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}

Bun.serve({
  port,
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/projects') {
      const projects = await listProjects();
      return json(projects);
    }

    if (request.method === 'GET' && url.pathname === '/api/projects/stream') {
      return projectStream();
    }

    if (request.method === 'POST' && url.pathname === '/api/projects') {
      const payload = (await request.json()) as UpsertProjectInput;
      const project = await upsertProject(payload);
      return json(project, 201);
    }

    return json({ error: 'not_found' }, 404);
  },
});

console.log(`Pivot Bun server listening on http://localhost:${port}`);
