export interface AppConfig {
  port: number;
  convexUrl: string;
  orchestrator: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    commandTimeoutMs: number;
  };
  git: {
    autoCleanupBranches: boolean;
    defaultRemote: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'pretty';
  };
}

function parseIntEnv(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseBoolEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export function loadConfig(): AppConfig {
  const convexUrl = process.env.CONVEX_URL || '';
  if (!convexUrl) {
    console.warn('[config] CONVEX_URL not set — Convex operations will fail. Set CONVEX_URL or CONVEX_DEPLOYMENT.');
  }
  return {
    port: parseIntEnv(process.env.PORT, 8081),
    convexUrl,
    orchestrator: {
      maxRetries: parseIntEnv(process.env.ORCHESTRATOR_MAX_RETRIES, 3),
      baseDelayMs: parseIntEnv(process.env.ORCHESTRATOR_BASE_DELAY_MS, 5000),
      maxDelayMs: parseIntEnv(process.env.ORCHESTRATOR_MAX_DELAY_MS, 60000),
      commandTimeoutMs: parseIntEnv(process.env.ORCHESTRATOR_TIMEOUT_MS, 600_000),
    },
    git: {
      autoCleanupBranches: parseBoolEnv(process.env.GIT_AUTO_CLEANUP_BRANCHES, true),
      defaultRemote: process.env.GIT_DEFAULT_REMOTE || 'origin',
    },
    logging: {
      level: (process.env.LOG_LEVEL as AppConfig['logging']['level']) || 'info',
      format: (process.env.LOG_FORMAT as AppConfig['logging']['format']) || 'pretty',
    },
  };
}

export const config = loadConfig();
