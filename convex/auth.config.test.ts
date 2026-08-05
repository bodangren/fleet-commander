import { afterEach, describe, expect, it } from 'bun:test';
import { loadAuthConfig, restoreAuthEnv, withAuthEnv, withNodeEnv } from './__fixtures__/auth';

afterEach(restoreAuthEnv);

describe('auth.config', () => {
  it('exports a non-empty providers array', async () => {
    withNodeEnv('production');
    withAuthEnv({ domain: 'https://auth.example.com', applicationID: 'fleet-commander-prod' });

    const config = await loadAuthConfig();

    expect(config.default.providers).toBeArrayOfSize(1);
    expect(config.default.providers[0].domain).toBe('https://auth.example.com');
    expect(config.default.providers[0].applicationID).toBe('fleet-commander-prod');
  });

  it('rejects loading with localhost defaults in production when provider env vars are unset', async () => {
    withNodeEnv('production');
    withAuthEnv({});

    await expect(loadAuthConfig()).rejects.toThrow();
  });
});
