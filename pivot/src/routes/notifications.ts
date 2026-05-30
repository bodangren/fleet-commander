import { Router, json, badRequest } from './router';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

/**
 * Registers notification routes for sending emails and marking notifications as read.
 * @param router - Express Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerNotificationRoutes(router: Router, client: ConvexHttpClient): void {
  router.post('/api/notifications/send-email', async (request) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const to = body.to as string | undefined;
    const subject = body.subject as string | undefined;
    const text = body.text as string | undefined;

    if (!to || !subject || !text) {
      return badRequest('to, subject, and text are required');
    }

    // MVP: log email instead of sending via SMTP
    console.log(`[email] To: ${to}, Subject: ${subject}, Body: ${text}`);

    return json({ ok: true, sent: false, queued: true, to, subject });
  });

  router.post('/api/notifications/mark-read', async (request) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = body.id as string | undefined;
    if (!id) return badRequest('id is required');
    await client.mutation(api.notifications.markRead, { id } as any);
    return json({ ok: true });
  });

  router.post('/api/notifications/mark-all-read', async (request) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = body.userId as string | undefined;
    if (!userId) return badRequest('userId is required');
    const count = await client.mutation(api.notifications.markAllRead, { userId });
    return json({ ok: true, count });
  });

  router.post('/api/notifications/delete-old', async () => {
    const count = await client.mutation(api.notifications.deleteOldNotifications, {});
    return json({ ok: true, count });
  });

  router.post('/api/notifications/preferences', async (request) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = body.userId as string | undefined;
    if (!userId) return badRequest('userId is required');

    const prefs = await client.mutation(api.notifications.upsertNotificationPreferences, {
      userId,
      muteAll: body.muteAll as boolean | undefined,
      inAppEnabled: body.inAppEnabled as boolean | undefined,
      webhookEnabled: body.webhookEnabled as boolean | undefined,
      webhookUrl: body.webhookUrl as string | undefined,
      emailEnabled: body.emailEnabled as boolean | undefined,
      email: body.email as string | undefined,
    });
    return json(prefs);
  });
}
