import { ConvexHttpClient } from 'convex/browser';
import { Router, json, badRequest } from './router';
import {
  simulateDispatches,
  aggregateSimulationReport,
  type SimulationDispatch,
} from '../policy/simulation';
import type { ScoreWeights } from '../policy/scoring';
import type { ConstraintContext } from '../orchestrator/constraints';
import type { Task } from '../orchestrator/types';
import { listDispatchPolicyStats, listHarnessReliabilityStats } from '../policy/statsClient';
import { api } from '../../../convex/_generated/api';

export interface SimulateRequestBody {
  windowDays: number;
  candidateWeights: Partial<ScoreWeights>;
  candidateRules: Partial<ConstraintContext>;
  dispatches?: SimulationDispatch[];
}

export function registerSimulationRoutes(router: Router, client: ConvexHttpClient): void {
  router.post('/api/policy/simulate', async (request) => {
    let body: SimulateRequestBody;
    try {
      body = (await request.json()) as SimulateRequestBody;
    } catch {
      return badRequest('Invalid JSON body');
    }

    if (typeof body.windowDays !== 'number' || body.windowDays <= 0) {
      return badRequest('windowDays must be a positive number');
    }

    const weights = body.candidateWeights ?? {};
    const rules = body.candidateRules ?? {};

    let dispatches: SimulationDispatch[] = body.dispatches ?? [];

    // If no dispatches provided, attempt to fetch from scoreAudit history
    if (dispatches.length === 0) {
      try {
        const since = Date.now() - body.windowDays * 24 * 60 * 60 * 1000;
        const audits = await client.query(api.scoreAudit.listScoreAuditSince, {
          since,
          limit: 1000,
        });

        if (audits.length === 0) {
          return badRequest(
            'No dispatches provided and no scoreAudit history found in window',
          );
        }

        // Fetch all tasks to reconstruct candidate pools
        const allTasksRaw = await client.query(api.fleetCatalog.listAllTasks, {});
        const taskMap = new Map<string, typeof allTasksRaw[0]>();
        for (const t of allTasksRaw) {
          taskMap.set(t.taskKey, t);
        }

        // Fetch run contracts for outcome data
        const contracts = await client.query(api.runContracts.listRunContractsSince, {
          since,
          limit: 1000,
        });
        const contractMap = new Map<string, typeof contracts[0]>();
        for (const c of contracts) {
          contractMap.set(c.taskId, c);
        }

        dispatches = audits.map((audit: any) => {
          const candidateKeys: string[] = JSON.parse(audit.candidatesJson);
          const candidates: SimulationDispatch['candidates'] = [];
          for (const key of candidateKeys) {
            const t = taskMap.get(key);
            if (t) {
              candidates.push({
                projectSlug: t.projectSlug,
                trackId: t.trackId,
                taskKey: t.taskKey,
                title: t.title,
                status: t.status as Task['status'],
                assignee: t.assignee,
                dependencies: t.dependencies,
                updatedAt: t.updatedAt,
              });
            }
          }

          const allTasksForDispatch = new Map<
            string,
            SimulationDispatch['candidates'][0]
          >();
          for (const c of candidates) {
            allTasksForDispatch.set(c.taskKey, c);
          }

          const contract = contractMap.get(audit.chosenTaskId);
          const outcome: SimulationDispatch['outcome'] = contract
            ? {
                executorStatus: contract.executorStatus,
                reviewerStatus: contract.reviewerStatus,
                recoveryAction: contract.recoveryAction,
                retries: contract.dispatchRejections?.length,
                coverageRegression: false, // not stored directly; infer from logs if needed
              }
            : undefined;

          return {
            historicalChoice: audit.chosenTaskId,
            candidates,
            allTasks: allTasksForDispatch,
            outcome,
          };
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return badRequest(`Failed to fetch historical dispatches: ${msg}`);
      }
    }

    const [policyStats, harnessStats] = await Promise.all([
      listDispatchPolicyStats(client, 1000),
      listHarnessReliabilityStats(client, 100),
    ]);

    const simulationResults = await simulateDispatches(
      dispatches,
      weights,
      rules,
      policyStats,
      harnessStats,
    );

    const report = aggregateSimulationReport(simulationResults, dispatches);

    // Persist simulation run
    try {
      await client.mutation(api.simulationRuns.createSimulationRun, {
        windowDays: body.windowDays,
        candidateWeightsJson: JSON.stringify(weights),
        candidateRulesJson: JSON.stringify(rules),
        reportJson: JSON.stringify(report),
      });
    } catch {
      // Persistence is best-effort
    }

    return json(report);
  });

  router.get('/api/policy/simulate/runs', async () => {
    try {
      const runs = await client.query(api.simulationRuns.listSimulationRuns, { limit: 50 });
      return json(runs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return json({ error: 'failed_to_list', message: msg }, 500);
    }
  });
}
