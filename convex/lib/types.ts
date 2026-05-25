/**
 * Shared document interfaces used across convex/lib modules.
 *
 * These types represent the canonical shapes for documents that are
 * consumed by multiple analytics, retrospective, and aggregation
 * functions. Prefer importing from here over redefining locally.
 */

/**
 * Orchestrator error record — used by analytics error bucketing
 * and retrospective sprint aggregation.
 */
export interface OrchestratorErrorDoc {
  projectSlug?: string;
  taskKey?: string;
  agentId?: string;
  operation: string;
  severity: string;
  message: string;
  createdAt: number;
}
