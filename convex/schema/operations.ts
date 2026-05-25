import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { issueStatus, notificationType } from '../lib/validators';

export default {
  alerts: defineTable({
    type: v.union(
      v.literal('circuit_open'),
      v.literal('stall_detected'),
      v.literal('budget_breach'),
      v.literal('schema_drift'),
      v.literal('health_check_failed'),
      v.literal('performance_regression'),
    ),
    severity: v.union(v.literal('critical'), v.literal('warning'), v.literal('info')),
    message: v.string(),
    contextJson: v.string(),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_type', ['type'])
    .index('by_severity', ['severity'])
    .index('by_resolved', ['resolved'])
    .index('by_created_at', ['createdAt'])
    .index('by_resolved_and_createdAt', ['resolved', 'createdAt']),

  issues: defineTable({
    projectSlug: v.string(),
    trackId: v.optional(v.string()),
    issueId: v.string(),
    title: v.string(),
    body: v.string(),
    status: issueStatus,
    assignedAgent: v.optional(v.string()),
    sourcePath: v.optional(v.string()),
    openedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_status', ['projectSlug', 'status'])
    .index('by_issue_id', ['issueId'])
    .index('by_status', ['status'])
    .index('by_status_and_openedAt', ['status', 'openedAt']),

  notifications: defineTable({
    userId: v.string(),
    type: notificationType,
    title: v.string(),
    body: v.string(),
    channel: v.union(v.literal('in_app'), v.literal('webhook'), v.literal('email')),
    read: v.boolean(),
    createdAt: v.number(),
    metadata: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_read', ['userId', 'read'])
    .index('by_user_and_type', ['userId', 'type'])
    .index('by_created_at', ['createdAt']),

  notificationPreferences: defineTable({
    userId: v.string(),
    muteAll: v.boolean(),
    inAppEnabled: v.boolean(),
    webhookUrl: v.optional(v.string()),
    webhookEnabled: v.boolean(),
    email: v.optional(v.string()),
    emailEnabled: v.boolean(),
    typeFilters: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId']),

  reconciliationEvents: defineTable({
    projectSlug: v.string(),
    artifactType: v.union(v.literal('track'), v.literal('task'), v.literal('issue')),
    artifactId: v.string(),
    divergenceType: v.union(v.literal('added'), v.literal('modified'), v.literal('deleted')),
    conductorHash: v.string(),
    canonicalHash: v.string(),
    description: v.string(),
    counter: v.number(),
    createdAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_artifact', ['artifactType', 'artifactId'])
    .index('by_created_at', ['createdAt']),

  reconciliationProposals: defineTable({
    projectSlug: v.string(),
    artifactType: v.union(v.literal('track'), v.literal('task'), v.literal('issue')),
    artifactId: v.string(),
    patchJson: v.string(),
    sourceSide: v.union(v.literal('convex'), v.literal('markdown')),
    reason: v.string(),
    status: v.union(v.literal('pending'), v.literal('applied'), v.literal('rejected')),
    eventId: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectSlug'])
    .index('by_artifact', ['artifactType', 'artifactId'])
    .index('by_status', ['status'])
    .index('by_project_and_status', ['projectSlug', 'status']),

  reconciliationDecisions: defineTable({
    proposalId: v.string(),
    decision: v.union(v.literal('apply'), v.literal('reject')),
    reason: v.optional(v.string()),
    conductorHash: v.string(),
    canonicalHash: v.string(),
    createdAt: v.number(),
  })
    .index('by_proposal', ['proposalId'])
    .index('by_hashes', ['conductorHash', 'canonicalHash']),
};
