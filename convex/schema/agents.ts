import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { agentRole, agentStatus, providerStatus, supportedModels } from '../lib/validators';

export default {
  employees: defineTable({
    name: v.string(),
    role: v.string(),
    skills: v.array(v.string()),
    model: v.string(),
    status: v.union(v.literal('active'), v.literal('away')),
    createdAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_name', ['name']),

  agents: defineTable({
    name: v.string(),
    role: agentRole,
    skills: v.array(v.string()),
    model: v.string(),
    costPerPoint: v.number(),
    reliability: v.number(),
    status: agentStatus,
    workload: v.number(),
    maxWorkload: v.number(),
    templateId: v.optional(v.id('agentTemplates')),
    createdAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_name', ['name'])
    .index('by_templateId', ['templateId']),

  providers: defineTable({
    name: v.string(),
    models: v.array(v.string()),
    status: providerStatus,
    latency: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_status', ['status']),

  harnessProfiles: defineTable({
    name: v.string(),
    binary: v.string(),
    discoveryCommand: v.optional(v.string()),
    discoveryParseStrategy: v.optional(v.string()),
    discoveryPattern: v.optional(v.string()),
    discoveryNotes: v.optional(v.string()),
    invocationTemplate: v.string(),
    invocationFlagsJson: v.string(),
    capabilitiesJson: v.string(),
    policyJson: v.string(),
    beforeRunHook: v.optional(v.string()),
    afterRunHook: v.optional(v.string()),
    afterCreateHook: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index('by_name', ['name']),

  harnessReliabilityStats: defineTable({
    harnessName: v.string(),
    successRate7d: v.number(),
    medianLatencyMs: v.number(),
    averageTokens: v.number(),
    reviewPassRateByTaskClassJson: v.string(),
    topFailureModesJson: v.string(),
    lastUpdatedAt: v.number(),
  })
    .index('by_name', ['harnessName'])
    .index('by_last_updated', ['lastUpdatedAt']),

  agentTemplates: defineTable({
    name: v.string(),
    role: agentRole,
    model: supportedModels,
    temperature: v.number(),
    systemPrompt: v.string(),
    skills: v.array(v.string()),
    estimatedCostPer1kTokens: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_role', ['role']),
};
