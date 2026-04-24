import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { resolveActor } from './lib/auth'

const analysisResultResponse = v.object({
  projectSlug: v.string(),
  executionId: v.string(),
  tool: v.string(),
  file: v.string(),
  line: v.optional(v.number()),
  column: v.optional(v.number()),
  severity: v.union(v.literal('error'), v.literal('warning'), v.literal('info')),
  message: v.string(),
  rule: v.optional(v.string()),
  createdAt: v.number(),
})

export const storeAnalysisResults = mutation({
  args: {
    projectSlug: v.string(),
    executionId: v.string(),
    results: v.array(
      v.object({
        tool: v.string(),
        file: v.string(),
        line: v.optional(v.number()),
        column: v.optional(v.number()),
        severity: v.union(v.literal('error'), v.literal('warning'), v.literal('info')),
        message: v.string(),
        rule: v.optional(v.string()),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    const now = Date.now()
    let count = 0

    for (const result of args.results) {
      await ctx.db.insert('analysisResults', {
        projectSlug: args.projectSlug,
        executionId: args.executionId,
        tool: result.tool,
        file: result.file,
        line: result.line,
        column: result.column,
        severity: result.severity,
        message: result.message,
        rule: result.rule,
        createdAt: now,
      })
      count++
    }

    return count
  },
})

export const getAnalysisByExecution = query({
  args: {
    executionId: v.string(),
    severity: v.optional(v.union(v.literal('error'), v.literal('warning'), v.literal('info'))),
  },
  returns: v.array(analysisResultResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx)

    let query = ctx.db
      .query('analysisResults')
      .withIndex('by_execution', (q) => q.eq('executionId', args.executionId))
      .order('asc')

    if (args.severity) {
      query = ctx.db
        .query('analysisResults')
        .withIndex('by_severity', (q) => q.eq('severity', args.severity!))
        .order('asc')
    }

    const results = await query.collect()

    if (args.severity) {
      return results.filter((r) => r.executionId === args.executionId)
    }

    return results
  },
})

export const getAnalysisByProject = query({
  args: {
    projectSlug: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(analysisResultResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    const limit = args.limit ?? 100

    return await ctx.db
      .query('analysisResults')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .order('desc')
      .take(limit)
  },
})

export const getAnalysisHistory = query({
  args: {
    projectSlug: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      executionId: v.string(),
      tool: v.string(),
      errorCount: v.number(),
      warningCount: v.number(),
      infoCount: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    const limit = args.limit ?? 50

    const results = await ctx.db
      .query('analysisResults')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.projectSlug))
      .order('desc')
      .take(limit * 10)

    const byExecution = new Map<
      string,
      { tool: string; errors: number; warnings: number; infos: number; createdAt: number }
    >()

    for (const r of results) {
      const key = r.executionId
      if (!byExecution.has(key)) {
        byExecution.set(key, {
          tool: r.tool,
          errors: 0,
          warnings: 0,
          infos: 0,
          createdAt: r.createdAt,
        })
      }
      const entry = byExecution.get(key)!
      if (r.severity === 'error') entry.errors++
      else if (r.severity === 'warning') entry.warnings++
      else entry.infos++
    }

    return Array.from(byExecution.entries())
      .slice(0, limit)
      .map(([executionId, data]) => ({
        executionId,
        tool: data.tool,
        errorCount: data.errors,
        warningCount: data.warnings,
        infoCount: data.infos,
        createdAt: data.createdAt,
      }))
  },
})

export const deleteAnalysisByExecution = mutation({
  args: {
    executionId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await resolveActor(ctx)
    let count = 0

    const results = await ctx.db
      .query('analysisResults')
      .withIndex('by_execution', (q) => q.eq('executionId', args.executionId))
      .collect()

    for (const r of results) {
      await ctx.db.delete(r._id)
      count++
    }

    return count
  },
})
