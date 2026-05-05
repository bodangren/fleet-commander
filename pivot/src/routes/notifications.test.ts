import { describe, expect, it, mock } from 'bun:test';
import { Router } from './router';
import { registerNotificationRoutes } from './notifications';

function createMockClient() {
  return {
    mutation: mock(async () => ({})),
    query: mock(async () => []),
  };
}

async function makeRequest(router: Router, method: string, path: string, body?: unknown): Promise<Response> {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const matched = router.match(method, path);
  if (!matched) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }
  return matched.handler(req, matched.params);
}

describe('Notification Routes', () => {
  it('send-email returns queued response', async () => {
    const router = new Router();
    const client = createMockClient();
    registerNotificationRoutes(router, client as any);

    const res = await makeRequest(router, 'POST', '/api/notifications/send-email', {
      to: 'admin@example.com',
      subject: 'Test',
      text: 'Hello',
    });
    const json = (await res.json()) as { ok: boolean; queued: boolean };
    expect(json.ok).toBe(true);
    expect(json.queued).toBe(true);
  });

  it('send-email rejects missing fields', async () => {
    const router = new Router();
    const client = createMockClient();
    registerNotificationRoutes(router, client as any);

    const res = await makeRequest(router, 'POST', '/api/notifications/send-email', {
      to: 'admin@example.com',
    });
    expect(res.status).toBe(400);
  });

  it('mark-read calls convex mutation', async () => {
    const router = new Router();
    const client = createMockClient();
    registerNotificationRoutes(router, client as any);

    const res = await makeRequest(router, 'POST', '/api/notifications/mark-read', {
      id: 'notification-id',
    });
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(client.mutation).toHaveBeenCalled();
  });

  it('mark-all-read calls convex mutation', async () => {
    const router = new Router();
    const client = createMockClient();
    registerNotificationRoutes(router, client as any);

    const res = await makeRequest(router, 'POST', '/api/notifications/mark-all-read', {
      userId: 'admin:system',
    });
    const json = (await res.json()) as { ok: boolean; count: number };
    expect(json.ok).toBe(true);
    expect(client.mutation).toHaveBeenCalled();
  });

  it('delete-old calls convex mutation', async () => {
    const router = new Router();
    const client = createMockClient();
    registerNotificationRoutes(router, client as any);

    const res = await makeRequest(router, 'POST', '/api/notifications/delete-old', {});
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(client.mutation).toHaveBeenCalled();
  });

  it('preferences upserts convex mutation', async () => {
    const router = new Router();
    const client = createMockClient();
    (client.mutation as ReturnType<typeof mock>).mockImplementation(async () => ({
      userId: 'admin:system',
      muteAll: true,
      inAppEnabled: false,
      webhookEnabled: false,
      emailEnabled: false,
      updatedAt: Date.now(),
    }));
    registerNotificationRoutes(router, client as any);

    const res = await makeRequest(router, 'POST', '/api/notifications/preferences', {
      userId: 'admin:system',
      muteAll: true,
      inAppEnabled: false,
    });
    const json = (await res.json()) as { userId: string; muteAll: boolean };
    expect(json.userId).toBe('admin:system');
    expect(json.muteAll).toBe(true);
    expect(client.mutation).toHaveBeenCalled();
  });
});
