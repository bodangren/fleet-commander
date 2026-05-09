import { createOpencode, type OpencodeClient } from '@opencode-ai/sdk';

let opencodeClient: OpencodeClient | null = null;
let opencodeServer: { url: string; close(): void } | null = null;

/**
 * Initialize the persistent OpenCode server and return the SDK client.
 * Safe to call multiple times — returns the existing client after first init.
 */
export async function initOpencodeServer(): Promise<OpencodeClient> {
  if (opencodeClient) return opencodeClient;

  const port = Number(process.env.OPENCODE_PORT ?? '8082');
  const { client, server } = await createOpencode({ port, timeout: 30000 });

  opencodeClient = client;
  opencodeServer = server;

  console.log(`[opencode] Server running at ${server.url}`);
  return client;
}

/**
 * Get the initialized OpenCode SDK client.
 * Throws if the server has not been started.
 */
export function getOpencodeClient(): OpencodeClient {
  if (!opencodeClient) {
    throw new Error(
      'OpenCode server not initialized. Call initOpencodeServer() first.',
    );
  }
  return opencodeClient;
}

/**
 * Gracefully shut down the OpenCode server.
 * Idempotent — safe to call multiple times.
 */
export function closeOpencodeServer(): void {
  if (opencodeServer) {
    try {
      opencodeServer.close();
      console.log('[opencode] Server closed.');
    } catch (err) {
      console.error('[opencode] Error during shutdown:', err);
    } finally {
      opencodeServer = null;
      opencodeClient = null;
    }
  }
}
