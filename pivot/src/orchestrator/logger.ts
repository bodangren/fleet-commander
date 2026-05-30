import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export type ErrorSeverity = 'fatal' | 'warning' | 'debug';

export interface LogContext {
  projectSlug?: string;
  taskKey?: string;
  agentId?: string;
  operation: string;
}

/**
 * Logs orchestrator errors to Convex backend.
 */
export async function logOrchestratorError(
  client: ConvexHttpClient,
  severity: ErrorSeverity,
  message: string,
  context: LogContext,
  error?: unknown,
): Promise<void> {
  const errorStack = error instanceof Error ? error.stack : undefined;

  try {
    await client.mutation(api.orchestratorErrors.logError, {
      projectSlug: context.projectSlug,
      taskKey: context.taskKey,
      agentId: context.agentId,
      operation: context.operation,
      severity,
      message,
      errorStack,
    });
  } catch (logErr) {
    // Last resort: console.error if even error logging fails
    console.error('Failed to log orchestrator error:', logErr);
    console.error(`[${severity}] ${context.operation}: ${message}`, error);
  }
}

/**
 * Logs errors to console with severity prefix and context.
 */
export function consoleLogError(
  severity: ErrorSeverity,
  message: string,
  context: LogContext,
  error?: unknown,
): void {
  const prefix = `[${severity.toUpperCase()}] ${context.operation}`;
  if (context.taskKey) {
    const suffix = `task=${context.taskKey}${context.agentId ? ` agent=${context.agentId}` : ''}`;
    if (severity === 'fatal') {
      console.error(`${prefix} [${suffix}]: ${message}`, error);
    } else if (severity === 'warning') {
      console.warn(`${prefix} [${suffix}]: ${message}`, error);
    } else {
      console.log(`${prefix} [${suffix}]: ${message}`, error);
    }
  } else {
    if (severity === 'fatal') {
      console.error(`${prefix}: ${message}`, error);
    } else if (severity === 'warning') {
      console.warn(`${prefix}: ${message}`, error);
    } else {
      console.log(`${prefix}: ${message}`, error);
    }
  }
}

/**
 * Logs errors to both console and Convex backend for persistence.
 */
export async function logAndCaptureError(
  client: ConvexHttpClient,
  severity: ErrorSeverity,
  message: string,
  context: LogContext,
  error?: unknown,
): Promise<void> {
  consoleLogError(severity, message, context, error);
  await logOrchestratorError(client, severity, message, context, error);
}
