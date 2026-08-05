/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as __fixtures___auth from "../__fixtures__/auth.js";
import type * as __fixtures___foundation from "../__fixtures__/foundation.js";
import type * as __fixtures___history from "../__fixtures__/history.js";
import type * as abTests from "../abTests.js";
import type * as agentTemplates from "../agentTemplates.js";
import type * as agents from "../agents.js";
import type * as alerts from "../alerts.js";
import type * as analysisResults from "../analysisResults.js";
import type * as analytics from "../analytics.js";
import type * as audit from "../audit.js";
import type * as budgets from "../budgets.js";
import type * as burnForecast from "../burnForecast.js";
import type * as circuitBreakers from "../circuitBreakers.js";
import type * as continuousMode from "../continuousMode.js";
import type * as costs from "../costs.js";
import type * as coverageRecords from "../coverageRecords.js";
import type * as dashboard from "../dashboard.js";
import type * as dependencies from "../dependencies.js";
import type * as dispatchPolicyStats from "../dispatchPolicyStats.js";
import type * as employees from "../employees.js";
import type * as executionLogs from "../executionLogs.js";
import type * as fleet from "../fleet.js";
import type * as fleetCatalog from "../fleetCatalog.js";
import type * as harnessProfiles from "../harnessProfiles.js";
import type * as harnessReliabilityStats from "../harnessReliabilityStats.js";
import type * as history_agents from "../history/agents.js";
import type * as history_sprints from "../history/sprints.js";
import type * as history_tasks from "../history/tasks.js";
import type * as insights from "../insights.js";
import type * as issues from "../issues.js";
import type * as kanban from "../kanban.js";
import type * as leaderboard from "../leaderboard.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_budget from "../lib/budget.js";
import type * as lib_burnForecast from "../lib/burnForecast.js";
import type * as lib_cost from "../lib/cost.js";
import type * as lib_costMetrics from "../lib/costMetrics.js";
import type * as lib_counters from "../lib/counters.js";
import type * as lib_insights from "../lib/insights.js";
import type * as lib_leaderboard from "../lib/leaderboard.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_performance from "../lib/performance.js";
import type * as lib_projectTemplates from "../lib/projectTemplates.js";
import type * as lib_retrospective from "../lib/retrospective.js";
import type * as lib_taskRows from "../lib/taskRows.js";
import type * as lib_types from "../lib/types.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migrate from "../migrate.js";
import type * as modelScores from "../modelScores.js";
import type * as notifications from "../notifications.js";
import type * as orchestratorErrors from "../orchestratorErrors.js";
import type * as performance from "../performance.js";
import type * as pipelineRuns from "../pipelineRuns.js";
import type * as policyWeights from "../policyWeights.js";
import type * as portfolio from "../portfolio.js";
import type * as projectTemplates from "../projectTemplates.js";
import type * as projects from "../projects.js";
import type * as providers from "../providers.js";
import type * as qualityProfiles from "../qualityProfiles.js";
import type * as qualityRuns from "../qualityRuns.js";
import type * as queueHealth from "../queueHealth.js";
import type * as reconciliationDecisions from "../reconciliationDecisions.js";
import type * as reconciliationEngine from "../reconciliationEngine.js";
import type * as reconciliationEvents from "../reconciliationEvents.js";
import type * as reconciliationProposals from "../reconciliationProposals.js";
import type * as reconciliationStatus from "../reconciliationStatus.js";
import type * as recoveryLog from "../recoveryLog.js";
import type * as retrospectives from "../retrospectives.js";
import type * as runContracts from "../runContracts.js";
import type * as scheduler from "../scheduler.js";
import type * as schema_agents from "../schema/agents.js";
import type * as schema_analytics from "../schema/analytics.js";
import type * as schema_contracts from "../schema/contracts.js";
import type * as schema_core from "../schema/core.js";
import type * as schema_operations from "../schema/operations.js";
import type * as schema_planning from "../schema/planning.js";
import type * as schema_tasks from "../schema/tasks.js";
import type * as scoreAudit from "../scoreAudit.js";
import type * as seed from "../seed.js";
import type * as seedAgents from "../seedAgents.js";
import type * as seedMvp from "../seedMvp.js";
import type * as simulationRuns from "../simulationRuns.js";
import type * as sprintPlanning from "../sprintPlanning.js";
import type * as sprints from "../sprints.js";
import type * as stats from "../stats.js";
import type * as systemMetadata from "../systemMetadata.js";
import type * as taskRecovery from "../taskRecovery.js";
import type * as taskTimeline from "../taskTimeline.js";
import type * as tasks from "../tasks.js";
import type * as tracks from "../tracks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "__fixtures__/auth": typeof __fixtures___auth;
  "__fixtures__/foundation": typeof __fixtures___foundation;
  "__fixtures__/history": typeof __fixtures___history;
  abTests: typeof abTests;
  agentTemplates: typeof agentTemplates;
  agents: typeof agents;
  alerts: typeof alerts;
  analysisResults: typeof analysisResults;
  analytics: typeof analytics;
  audit: typeof audit;
  budgets: typeof budgets;
  burnForecast: typeof burnForecast;
  circuitBreakers: typeof circuitBreakers;
  continuousMode: typeof continuousMode;
  costs: typeof costs;
  coverageRecords: typeof coverageRecords;
  dashboard: typeof dashboard;
  dependencies: typeof dependencies;
  dispatchPolicyStats: typeof dispatchPolicyStats;
  employees: typeof employees;
  executionLogs: typeof executionLogs;
  fleet: typeof fleet;
  fleetCatalog: typeof fleetCatalog;
  harnessProfiles: typeof harnessProfiles;
  harnessReliabilityStats: typeof harnessReliabilityStats;
  "history/agents": typeof history_agents;
  "history/sprints": typeof history_sprints;
  "history/tasks": typeof history_tasks;
  insights: typeof insights;
  issues: typeof issues;
  kanban: typeof kanban;
  leaderboard: typeof leaderboard;
  "lib/analytics": typeof lib_analytics;
  "lib/auth": typeof lib_auth;
  "lib/budget": typeof lib_budget;
  "lib/burnForecast": typeof lib_burnForecast;
  "lib/cost": typeof lib_cost;
  "lib/costMetrics": typeof lib_costMetrics;
  "lib/counters": typeof lib_counters;
  "lib/insights": typeof lib_insights;
  "lib/leaderboard": typeof lib_leaderboard;
  "lib/notifications": typeof lib_notifications;
  "lib/performance": typeof lib_performance;
  "lib/projectTemplates": typeof lib_projectTemplates;
  "lib/retrospective": typeof lib_retrospective;
  "lib/taskRows": typeof lib_taskRows;
  "lib/types": typeof lib_types;
  "lib/validators": typeof lib_validators;
  migrate: typeof migrate;
  modelScores: typeof modelScores;
  notifications: typeof notifications;
  orchestratorErrors: typeof orchestratorErrors;
  performance: typeof performance;
  pipelineRuns: typeof pipelineRuns;
  policyWeights: typeof policyWeights;
  portfolio: typeof portfolio;
  projectTemplates: typeof projectTemplates;
  projects: typeof projects;
  providers: typeof providers;
  qualityProfiles: typeof qualityProfiles;
  qualityRuns: typeof qualityRuns;
  queueHealth: typeof queueHealth;
  reconciliationDecisions: typeof reconciliationDecisions;
  reconciliationEngine: typeof reconciliationEngine;
  reconciliationEvents: typeof reconciliationEvents;
  reconciliationProposals: typeof reconciliationProposals;
  reconciliationStatus: typeof reconciliationStatus;
  recoveryLog: typeof recoveryLog;
  retrospectives: typeof retrospectives;
  runContracts: typeof runContracts;
  scheduler: typeof scheduler;
  "schema/agents": typeof schema_agents;
  "schema/analytics": typeof schema_analytics;
  "schema/contracts": typeof schema_contracts;
  "schema/core": typeof schema_core;
  "schema/operations": typeof schema_operations;
  "schema/planning": typeof schema_planning;
  "schema/tasks": typeof schema_tasks;
  scoreAudit: typeof scoreAudit;
  seed: typeof seed;
  seedAgents: typeof seedAgents;
  seedMvp: typeof seedMvp;
  simulationRuns: typeof simulationRuns;
  sprintPlanning: typeof sprintPlanning;
  sprints: typeof sprints;
  stats: typeof stats;
  systemMetadata: typeof systemMetadata;
  taskRecovery: typeof taskRecovery;
  taskTimeline: typeof taskTimeline;
  tasks: typeof tasks;
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
