import { ConvexHttpClient } from 'convex/browser';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { api } from '../../convex/_generated/api';
import type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
} from 'convex/server';

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

/**
 * Re-export the generated Convex API for typed function references.
 * Use these instead of string identifiers with `as never` casts.
 */
export { api };

/**
 * Type-safe query helper that uses generated API references.
 */
export async function typedQuery<Fn extends FunctionReference<'query'>>(
  client: ConvexHttpClient,
  fn: Fn,
  args: FunctionArgs<Fn>,
): Promise<FunctionReturnType<Fn>> {
  return client.query(fn, args) as Promise<FunctionReturnType<Fn>>;
}

/**
 * Type-safe mutation helper that uses generated API references.
 */
export async function typedMutation<Fn extends FunctionReference<'mutation'>>(
  client: ConvexHttpClient,
  fn: Fn,
  args: FunctionArgs<Fn>,
): Promise<FunctionReturnType<Fn>> {
  return client.mutation(fn, args) as Promise<FunctionReturnType<Fn>>;
}
