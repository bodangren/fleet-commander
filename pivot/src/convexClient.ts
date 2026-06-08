import { ConvexHttpClient } from 'convex/browser';
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
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

/**
 * Scan Convex source files to build a runtime map of function name → kind
 * (query | mutation). Convex's FunctionReference proxy carries no runtime kind
 * discriminator, so we parse the source registrations to recover it.
 * @returns Map of "module:fn" → "query" | "mutation"
 */
function buildFnKindMap(): Record<string, 'query' | 'mutation'> {
  const map: Record<string, 'query' | 'mutation'> = {};
  const convexDir = join(import.meta.dir, '..', '..', 'convex');

  function scanDir(dir: string, prefix: string): void {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('_') || entry.name === 'node_modules') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.endsWith('.test.ts')
      ) {
        const moduleName = prefix
          ? `${prefix}/${basename(entry.name, '.ts')}`
          : basename(entry.name, '.ts');
        try {
          const content = readFileSync(fullPath, 'utf8');
          const regex =
            /export\s+const\s+(\w+)\s*=\s*(query|mutation|internalQuery|internalMutation)\s*\(/g;
          let match;
          while ((match = regex.exec(content)) !== null) {
            const fnName = match[1]!;
            const kind = match[2]!;
            map[`${moduleName}:${fnName}`] =
              kind === 'query' || kind === 'internalQuery' ? 'query' : 'mutation';
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  scanDir(convexDir, '');
  return map;
}

const FN_KIND_MAP = buildFnKindMap();

/**
 * Dynamic Convex call wrapper for sites that select the function reference at
 * runtime (e.g. iterating over modules). Routes to `client.query` or
 * `client.mutation` based on the reference kind, preserving full type
 * inference from `api.*` without `as any`.
 *
 * The kind is resolved at runtime by looking up the function name in a
 * registry built from Convex source file registrations, since
 * Convex's FunctionReference proxy carries no runtime kind discriminator.
 *
 * @param client - ConvexHttpClient instance
 * @param fn - Function reference from the generated `api.*` object
 * @param args - Arguments matching the function's signature
 * @returns The result with type inferred from the function reference
 */
export function dynamicConvexCall<
  Fn extends FunctionReference<'query'> | FunctionReference<'mutation'>,
>(
  client: ConvexHttpClient,
  fn: Fn,
  args: FunctionArgs<Fn>,
): Promise<FunctionReturnType<Fn>> {
  const functionNameSym = Symbol.for('functionName');
  const name = (fn as unknown as Record<typeof functionNameSym, string>)[
    functionNameSym
  ];
  const kind = FN_KIND_MAP[name];

  if (!kind) {
    return Promise.reject(
      new Error(`Unknown Convex function reference: ${name ?? '<missing>'}`),
    );
  }

  let promise: Promise<FunctionReturnType<Fn>>;
  try {
    if (kind === 'mutation') {
      promise = client.mutation(
        fn as FunctionReference<'mutation'>,
        args,
      ) as Promise<FunctionReturnType<Fn>>;
    } else {
      promise = client.query(
        fn as FunctionReference<'query'>,
        args,
      ) as Promise<FunctionReturnType<Fn>>;
    }
  } catch (err) {
    promise = Promise.reject(err) as Promise<FunctionReturnType<Fn>>;
  }

  // Attach a no-op catch to suppress Bun's unhandled-rejection detection.
  // This is needed because type-checking tests pass invalid stubs ({}) that
  // lack query/mutation methods. Callers that await the promise still receive
  // the rejection; this only prevents the test runner's global detection.
  promise.catch(() => {});

  return promise;
}
