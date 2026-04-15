/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as circuitBreakers from "../circuitBreakers.js";
import type * as continuousMode from "../continuousMode.js";
import type * as coverageRecords from "../coverageRecords.js";
import type * as executionLogs from "../executionLogs.js";
import type * as fleetCatalog from "../fleetCatalog.js";
import type * as harnessProfiles from "../harnessProfiles.js";
import type * as issues from "../issues.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_validators from "../lib/validators.js";
import type * as pipelines from "../pipelines.js";
import type * as projects from "../projects.js";
import type * as recoveryLog from "../recoveryLog.js";
import type * as reconciliationEvents from "../reconciliationEvents.js";
import type * as runContracts from "../runContracts.js";
import type * as sprints from "../sprints.js";
import type * as stats from "../stats.js";
import type * as taskRecovery from "../taskRecovery.js";
import type * as tracks from "../tracks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  circuitBreakers: typeof circuitBreakers;
  continuousMode: typeof continuousMode;
  coverageRecords: typeof coverageRecords;
  executionLogs: typeof executionLogs;
  fleetCatalog: typeof fleetCatalog;
  harnessProfiles: typeof harnessProfiles;
  issues: typeof issues;
  "lib/auth": typeof lib_auth;
  "lib/validators": typeof lib_validators;
  pipelines: typeof pipelines;
  projects: typeof projects;
  recoveryLog: typeof recoveryLog;
  reconciliationEvents: typeof reconciliationEvents;
  runContracts: typeof runContracts;
  sprints: typeof sprints;
  stats: typeof stats;
  taskRecovery: typeof taskRecovery;
  tracks: typeof tracks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
