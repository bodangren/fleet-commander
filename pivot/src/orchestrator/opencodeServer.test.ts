import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';

const mockServer = { url: 'http://localhost:9999', close: mock(() => {}) };
const mockClient = {
  session: { create: mock(async () => {}), prompt: mock(async () => {}) },
};

mock.module('@opencode-ai/sdk', () => ({
  createOpencode: () => Promise.resolve({ client: mockClient, server: mockServer }),
}));

// Re-import after mock to get the mocked module
const { initOpencodeServer, getOpencodeClient, closeOpencodeServer } =
  await import('./opencodeServer');

describe('opencodeServer', () => {
  beforeEach(() => {
    // Reset singleton state by closing
    closeOpencodeServer();
    mockServer.close.mockReset();
  });

  afterEach(() => {
    closeOpencodeServer();
  });

  describe('getOpencodeClient', () => {
    it('throws when server is not initialized', () => {
      expect(() => getOpencodeClient()).toThrow(
        'OpenCode server not initialized',
      );
    });
  });

  describe('initOpencodeServer', () => {
    it('initializes server and returns client', async () => {
      const client = await initOpencodeServer();
      expect(client).toBeDefined();
      expect(typeof client.session).toBe('object');
    });

    it('is idempotent — returns same client on second call', async () => {
      const client1 = await initOpencodeServer();
      const client2 = await initOpencodeServer();
      expect(client1).toBe(client2);
    });
  });

  describe('closeOpencodeServer', () => {
    it('closes server and clears client', async () => {
      await initOpencodeServer();
      expect(() => getOpencodeClient()).not.toThrow();

      closeOpencodeServer();
      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(() => getOpencodeClient()).toThrow(
        'OpenCode server not initialized',
      );
    });

    it('is idempotent — safe to call multiple times', async () => {
      await initOpencodeServer();
      closeOpencodeServer();
      closeOpencodeServer();
      closeOpencodeServer();
      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    it('is safe to call before any init', () => {
      expect(() => closeOpencodeServer()).not.toThrow();
    });
  });
});
