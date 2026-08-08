/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import type { UserIdentity } from 'convex/server';
import schema from '../convex/schema';

const modules = import.meta.glob('../convex/**/*.ts');

const testIdentity: Partial<UserIdentity> = {
  tokenIdentifier: 'test-user',
  subject: 'test-user',
  issuer: 'https://auth.test.fleet-commander.local',
};

/**
 * Creates an isolated Convex test backend with the shared schema and all
 * registered Convex function modules.
 *
 * @returns A Convex test backend authenticated as the stable test identity.
 */
export function createConvexTest() {
  return convexTest(schema, modules).withIdentity(testIdentity);
}

/**
 * Creates an isolated Convex test backend without an authenticated identity.
 *
 * @returns A Convex test backend whose auth identity is absent.
 */
export function createUnauthenticatedConvexTest() {
  return convexTest(schema, modules);
}
