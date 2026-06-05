import type { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { typedQuery, typedMutation } from '../convexClient';

/**
 * Configuration for a single provider health probe.
 */
export interface ProviderProbeConfig {
  providerId: string;
  providerName: string;
  baseUrl: string;
  models: string[];
  apiKey?: string;
}

/**
 * Result of a single health probe.
 */
export interface ProbeResult {
  providerId: string;
  providerName: string;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Injectable Convex access functions. Defaults to the real `convexClient`
 * helpers; tests pass stubs so they never need `mock.module('../convexClient')`
 * or `mock.module('.../_generated/api')`, both of which leak globally across
 * test files in bun (see TD-228).
 */
export interface ProviderHealthMonitorDeps {
  query: typeof typedQuery;
  mutation: typeof typedMutation;
}

/**
 * ProviderHealthMonitor probes each configured LLM provider on a regular
 * heartbeat and records health status in Convex.
 *
 * Uses a cheap health check (models list endpoint) to determine provider
 * availability and latency. Follows the withExecutionGuard pattern from
 * lessons-learned to prevent overlapping probes.
 */
export class ProviderHealthMonitor {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private probing = false; // execution guard
  private readonly intervalMs: number;

  constructor(
    private readonly client: ConvexHttpClient,
    intervalMs = 60_000, // 60s default
    private readonly apiKeys: Record<string, string> = {},
    private readonly deps: ProviderHealthMonitorDeps = {
      query: typedQuery,
      mutation: typedMutation,
    },
  ) {
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    console.log(
      `[provider-health] Starting health monitor (interval: ${this.intervalMs / 1000}s)`,
    );
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    console.log('[provider-health] Health monitor stopped');
  }

  private tick(): void {
    if (!this.running) return;

    this.timerId = setTimeout(async () => {
      if (!this.running) return;

      // Execution guard: skip if previous probe is still running
      if (this.probing) {
        console.warn('[provider-health] Previous probe still running, skipping');
        this.tick();
        return;
      }

      this.probing = true;
      try {
        await this.probeAll();
      } catch (err) {
        console.error('[provider-health] Probe cycle error:', err);
      } finally {
        this.probing = false;
      }
      this.tick();
    }, this.intervalMs);
  }

  /**
   * Probe all registered providers and update their health in Convex.
   */
  async probeAll(): Promise<ProbeResult[]> {
    const providers = await this.loadProviders();
    if (providers.length === 0) return [];

    const results = await Promise.allSettled(
      providers.map((p) => this.probeProvider(p)),
    );

    const probeResults: ProbeResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const provider = providers[i];

      if (result.status === 'fulfilled') {
        probeResults.push(result.value);
        await this.recordResult(result.value);
      } else {
        const failResult: ProbeResult = {
          providerId: provider.providerId,
          providerName: provider.providerName,
          latencyMs: 0,
          success: false,
          errorMessage:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        };
        probeResults.push(failResult);
        await this.recordResult(failResult);
      }
    }

    return probeResults;
  }

  /**
   * Load provider list from Convex.
   */
  private async loadProviders(): Promise<ProviderProbeConfig[]> {
    try {
      const providers = await this.deps.query(
        this.client,
        api.providers.getProviderHealth,
        {},
      );

      return providers.map((p) => ({
        providerId: p._id,
        providerName: p.name,
        baseUrl: p.baseUrl ?? `https://api.${p.name}.com`,
        models: p.models,
        apiKey: this.apiKeys[p.name],
      }));
    } catch (err) {
      console.error('[provider-health] Failed to load providers:', err);
      return [];
    }
  }

  /**
   * Probe a single provider with a cheap health check.
   * Tries the models list endpoint first, falls back to a simple GET.
   */
  async probeProvider(config: ProviderProbeConfig): Promise<ProbeResult> {
    const startMs = Date.now();

    try {
      const url = `${config.baseUrl}/v1/models`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(15_000), // 15s timeout
        headers,
      });

      const latencyMs = Date.now() - startMs;

      if (!response.ok) {
        return {
          providerId: config.providerId,
          providerName: config.providerName,
          latencyMs,
          success: false,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        providerId: config.providerId,
        providerName: config.providerName,
        latencyMs,
        success: true,
      };
    } catch (err) {
      const latencyMs = Date.now() - startMs;
      return {
        providerId: config.providerId,
        providerName: config.providerName,
        latencyMs,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Record a probe result in Convex.
   */
  private async recordResult(result: ProbeResult): Promise<void> {
    try {
      await this.deps.mutation(this.client, api.providers.updateProviderHealth, {
        providerId: result.providerId as any,
        latencyMs: result.latencyMs,
        success: result.success,
        errorMessage: result.errorMessage,
      });

      if (!result.success) {
        console.warn(
          `[provider-health] ${result.providerName}: UNHEALTHY (${result.errorMessage})`,
        );
      }
    } catch (err) {
      console.error(
        `[provider-health] Failed to record result for ${result.providerName}:`,
        err,
      );
    }
  }
}
