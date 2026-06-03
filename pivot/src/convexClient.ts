import { ConvexHttpClient } from 'convex/browser';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { api } from '../../convex/_generated/api';
import type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
} from 'convex/server';

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

/**
 * Re-export the generated Convex API for typed function references.
 * Use these instead of string identifiers with `as never` casts.
 */
export { api };

/**
 * Type-safe query helper using generated API references
 * @param client - ConvexHttpClient instance
 * @param fn - Query function reference
 * @param args - Query arguments
 * @returns Query result with proper typing
 */
export async function typedQuery<Fn extends FunctionReference<'query'>>(
  client: ConvexHttpClient,
  fn: Fn,
  args: FunctionArgs<Fn>,
): Promise<FunctionReturnType<Fn>> {
  return client.query(fn, args) as Promise<FunctionReturnType<Fn>>;
}

/**
 * Type-safe mutation helper using generated API references
 * @param client - ConvexHttpClient instance
 * @param fn - Mutation function reference
 * @param args - Mutation arguments
 * @returns Mutation result with proper typing
 */
export async function typedMutation<Fn extends FunctionReference<'mutation'>>(
  client: ConvexHttpClient,
  fn: Fn,
  args: FunctionArgs<Fn>,
): Promise<FunctionReturnType<Fn>> {
  return client.mutation(fn, args) as Promise<FunctionReturnType<Fn>>;
}
