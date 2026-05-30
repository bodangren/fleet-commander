import { ConvexHttpClient } from 'convex/browser';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read a value from .env.local file at cwd or parent
 * @param key - Environment variable key to read
 * @returns The value or null if not found
 */
function readEnvLocalValue(key: string): string | null {
  const candidatePaths = [
    join(process.cwd(), '.env.local'),
    join(process.cwd(), '..', '.env.local'),
  ];

  for (const envLocalPath of candidatePaths) {
    try {
      const content = readFileSync(envLocalPath, 'utf8');
      const line = content
        .split('\n')
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${key}=`));
      if (line) {
        return line.slice(`${key}=`.length);
      }
    } catch {
      // continue checking remaining candidates
    }
  }

  return null;
}

/**
 * Get Convex URL from env vars or .env.local, throw if missing
 * @returns The Convex URL string
 * @throws Error if no Convex URL is configured
 */
export function getConvexUrl(): string {
  const fromEnv =
    process.env.CONVEX_URL ??
    process.env.VITE_CONVEX_URL ??
    process.env.NEXT_PUBLIC_CONVEX_URL ??
    readEnvLocalValue('CONVEX_URL');

  if (!fromEnv) {
    throw new Error(
      'Missing Convex URL. Set CONVEX_URL, VITE_CONVEX_URL, or NEXT_PUBLIC_CONVEX_URL.',
    );
  }

  return fromEnv;
}

/**
 * Create a ConvexHttpClient with URL from getConvexUrl
 * @returns Configured ConvexHttpClient instance
 */
export function createConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(getConvexUrl());
}
