/**
 * QA executor — dev-stack probe and remediation for the E2E smoke test.
 *
 * Spec:           measure/tracks/e2e_qa_smoke_20260613/spec.md (STORY-Q2)
 * Plan:           measure/tracks/e2e_qa_smoke_20260613/plan.md (Phase S2)
 * Test strategy:  measure/tracks/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 2 — Dev stack health")
 *
 * This module probes the four dev-stack services (Vite frontend, pivot
 * backend, Convex deployment, kimi-webbridge daemon) and returns a
 * structured result.  When kimi-webbridge reports extension_connected:
 * false, it produces a Finding (Q-FIND-001) and a skip directive for
 * Phases S3–S5 so the inventory + findings infra remain useful.
 *
 * All probe I/O is injected via the `ProbeRunner` interface so tests
 * can substitute a fake runner (DI per the `(bun_mock_module)` lesson).
 */
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Exact command paths / URLs / env-var keys the probe touches.
 * Pinned by the contract test so any drift (port change, binary
 * relocation) breaks loudly.
 */
export const PROBE_COMMANDS = {
  frontendUrl: 'http://localhost:5173',
  pivotHealthUrl: 'http://localhost:8081/api/health',
  convexEnvKey: 'CONVEX_DEPLOYMENT',
  kimiBinary: `${process.env.HOME}/.kimi-webbridge/bin/kimi-webbridge`,
  kimiArgs: ['status'],
} as const;

/**
 * Dependency-injection interface for the probe's I/O surface.
 * Tests supply a fake implementation; the real executor supplies
 * HTTP fetch, process.env read, and child_process.spawn.
 */
export interface ProbeRunner {
  httpGet(url: string): Promise<boolean>;
  readEnv(key: string): string | undefined;
  spawnKimi(): Promise<{ running: boolean; extension_connected: boolean }>;
}

/**
 * Structured result of a dev-stack probe.
 *
 * In-memory shape uses camelCase `extensionConnected`; the on-disk
 * metadata.json wire format uses snake_case `extension_connected`
 * (matching the upstream kimi-webbridge JSON shape).
 */
export interface ProbeResult {
  frontend: boolean;
  pivot: boolean;
  convex: boolean;
  kimi: {
    running: boolean;
    extensionConnected: boolean;
  };
}

/**
 * Finding shape compatible with Phase S6's contract:
 * `{ id: 'Q-FIND-NNN', route, element?, action, severity, expected,
 *   actual, screenshotPath, reproSteps[] }`.
 */
export interface Finding {
  id: string;
  route: string;
  action: string;
  severity: string;
  expected: string;
  actual: string;
  screenshotPath: string;
  reproSteps: string[];
}

/**
 * Probe all four dev-stack services via the injected runner.
 *
 * @param runner  Dependency-injected I/O surface.
 * @returns       `ProbeResult` with boolean flags per service.
 */
export async function probeStack(runner: ProbeRunner): Promise<ProbeResult> {
  const [frontend, pivot, kimiStatus] = await Promise.all([
    runner.httpGet(PROBE_COMMANDS.frontendUrl),
    runner.httpGet(PROBE_COMMANDS.pivotHealthUrl),
    runner.spawnKimi(),
  ]);

  const convexValue = runner.readEnv(PROBE_COMMANDS.convexEnvKey);
  const convex = convexValue !== undefined && convexValue !== '';

  return {
    frontend,
    pivot,
    convex,
    kimi: {
      running: kimiStatus.running,
      extensionConnected: kimiStatus.extension_connected,
    },
  };
}

/**
 * Produce a human-readable remediation message for any failing probe.
 * Returns an empty string when every probe is green.
 *
 * @param result  The `ProbeResult` to inspect.
 * @returns       Multi-line remediation guidance, or `''` if all green.
 */
export function formatRemediation(result: ProbeResult): string {
  const lines: string[] = [];

  if (!result.frontend) {
    lines.push(
      'frontend dev server is not responding on http://localhost:5173 — run `npm run dev` to start the Vite dev server.',
    );
  }
  if (!result.pivot) {
    lines.push(
      'pivot Bun server is not responding on /api/health — check that the pivot server is running on port 8081.',
    );
  }
  if (!result.convex) {
    lines.push(
      'CONVEX_DEPLOYMENT environment variable is not set — export it or add it to your .env file.',
    );
  }
  if (!result.kimi.running) {
    lines.push(
      'kimi-webbridge daemon is not running — start it with `~/.kimi-webbridge/bin/kimi-webbridge`.',
    );
  }
  if (result.kimi.running && !result.kimi.extensionConnected) {
    lines.push(
      'kimi-webbridge extension not connected — open your browser and retry.',
    );
  }

  return lines.join('\n');
}

/**
 * Handle the case where kimi-webbridge reports extension_connected: false.
 *
 * Per plan sub-task #5: "If `kimi` reports `extension_connected: false`,
 * file a `Q-FIND-001` finding with severity High and skip Phases S3-S5
 * with a recorded `skipped: true` reason. Do NOT abort the track."
 *
 * @param probeResult  The probe result (only kimi.extensionConnected matters).
 * @returns            `{ finding, skipPhases, skipped, reason }`.
 */
export function handleKimiDisconnected(probeResult: ProbeResult): {
  finding: Finding;
  skipPhases: string[];
  skipped: boolean;
  reason: string;
} {
  const finding: Finding = {
    id: 'Q-FIND-001',
    route: 'kimi-webbridge',
    action: 'probe',
    severity: 'High',
    expected: 'extension_connected === true',
    actual: 'extension_connected === false',
    screenshotPath: '',
    reproSteps: [
      'Run the QA dev-stack probe',
      'Observe kimi.spawnKimi() returns extension_connected: false',
      'Verify the browser extension is installed and enabled',
    ],
  };

  return {
    finding,
    skipPhases: ['S3', 'S4', 'S5'],
    skipped: true,
    reason:
      'kimi-webbridge extension not connected — skipping browser-dependent phases S3, S4, S5.',
  };
}

/**
 * Write the probe result to a metadata.json file.
 *
 * The on-disk format uses snake_case `extension_connected` (matching
 * the kimi-webbridge wire format already present in metadata.json).
 * Every existing key is preserved; only `qa_probe` is overwritten.
 *
 * @param metadataPath  Absolute path to the metadata.json file.
 * @param result        The probe result to record.
 */
export async function writeProbeResult(
  metadataPath: string,
  result: ProbeResult,
): Promise<void> {
  const existing = JSON.parse(readFileSync(metadataPath, 'utf8'));

  existing.qa_probe = {
    frontend: result.frontend,
    pivot: result.pivot,
    convex: result.convex,
    kimi: {
      running: result.kimi.running,
      extension_connected: result.kimi.extensionConnected,
    },
  };

  writeFileSync(metadataPath, JSON.stringify(existing, null, 2) + '\n');
}
