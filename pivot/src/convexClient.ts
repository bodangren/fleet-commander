import { ConvexHttpClient } from 'convex/browser';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

export function createConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(getConvexUrl());
}
