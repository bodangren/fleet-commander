/**
 * Contract test for the QA executor's dev-stack probe (Phase S2, STORY-Q2).
 *
 * Spec:           measure/archive/e2e_qa_smoke_20260613/spec.md (STORY-Q2)
 * Plan:           measure/archive/e2e_qa_smoke_20260613/plan.md (Phase S2)
 * Test strategy:  measure/archive/e2e_qa_smoke_20260613/test-strategy.md
 *                 (§"Phase 2 — Dev stack health" pins the four probe targets
 *                  this test enforces: Vite 5173, pivot 8081/api/health,
 *                  CONVEX_DEPLOYMENT env, kimi-webbridge status.)
 *
 * Why a separate test file from `build-inventory.contract.test.ts`?
 *
 *   `build-inventory.contract.test.ts` enforces the Phase S1 inventory
 *   shape; this file enforces the Phase S2 executor probe contract. They
 *   are independent and run independently.
 *
 * Why dependency injection (fake `ProbeRunner`) instead of `mock.module()`?
 *
 *   `(bun_mock_module)` in lessons-learned: "`mock.module()` persists across
 *   test files; prefer dependency injection over module mocks." The probe
 *   touches the network and the file system, so a fake runner is the only
 *   way to make the test deterministic and bounded.
 *
 *   The fake runner *also* gives us an exact-path assertion surface
 *   (per the MID prompt: "If testing a shell runner or fake harness, prove
 *   the fake mode intercepts the exact command path or test the command
 *   string directly"). Each fake method records the URL/binary/env-var key
 *   it was asked to probe so the test can assert literal strings — a
 *   real-network smoke would not surface that.
 *
 * Red signal (expected failures at HEAD):
 *
 *   The entire test file fails to load because `./qa-executor` does not
 *   exist on disk. Once GREEN creates the module, every individual `it()`
 *   becomes its own targeted failure for the specific contract it pins:
 *
 *     - probeStack contract shape (frontend / pivot / convex / kimi.{running,extensionConnected})
 *     - PROBE_COMMANDS export pins exact URL/binary/env-var strings
 *     - fake runner intercepts exact paths (proves probeStack uses PROBE_COMMANDS)
 *     - formatRemediation() emits per-probe halt messages
 *     - handleKimiDisconnected() files Q-FIND-001 + skipPhases ['S3','S4','S5']
 *     - writeProbeResult() round-trips through metadata.json with snake_case on disk
 *
 * Live-behaviour pairing:
 *
 *   This is the static contract for the probe. The live gate is Phase S2's
 *   "Generate Docs & Doctor" sub-task: run the probe against the real dev
 *   stack and record the result in `metadata.json.qa_probe`. The live
 *   evidence is captured by GREEN/REVIEW; this Red file pins the executable
 *   shape so the live runner has something to test against.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Importing from a module that does not yet exist on disk is the primary
// Red signal. Bun's loader will throw a `ResolveMessage` ("Cannot find
// module './qa-executor'") on the very first `import` below until GREEN
// creates `scripts/qa-executor.ts` and exports each symbol.
import {
  PROBE_COMMANDS,
  createNodeProbeRunner,
  formatRemediation,
  handleKimiDisconnected,
  probeStack,
  writeProbeResult,
  type Finding,
  type ProbeResult,
  type ProbeRunner,
} from './qa-executor';

/**
 * Fake `ProbeRunner` implementation: records the exact arguments each
 * probe method receives, and returns canned results from a script the
 * test populates per-case. The fake never touches the network, the
 * filesystem, or `process.env`, so the test is hermetic.
 *
 * Each `*Calls` array captures the literal command-path / URL / env-var
 * key the probe asked the runner for. Asserting these arrays proves
 * `probeStack()` uses `PROBE_COMMANDS` (and not some hard-coded literal
 * that drifts from the contract).
 */
interface FakeProbeRunner extends ProbeRunner {
  httpGetCalls: string[];
  readEnvCalls: string[];
  spawnCalls: Array<{ binary: string; args: string[] }>;
}

/**
 * Build a `FakeProbeRunner` from a results script. Each script field
 * pins what the corresponding probe method returns; omitted fields
 * default to an "all green" result so individual tests only have to
 * declare the field they care about.
 */
function makeFakeRunner(script: {
  httpGet?: (url: string) => Promise<boolean> | boolean;
  readEnv?: (key: string) => string | undefined;
  spawnKimi?: (
    binary: string,
    args: readonly string[],
  ) => Promise<{
    running: boolean;
    extension_connected: boolean;
  }> | { running: boolean; extension_connected: boolean };
} = {}): FakeProbeRunner {
  const httpGetCalls: string[] = [];
  const readEnvCalls: string[] = [];
  const spawnCalls: Array<{ binary: string; args: string[] }> = [];

  return {
    httpGetCalls,
    readEnvCalls,
    spawnCalls,
    async httpGet(url: string): Promise<boolean> {
      httpGetCalls.push(url);
      return script.httpGet ? await script.httpGet(url) : true;
    },
    readEnv(key: string): string | undefined {
      readEnvCalls.push(key);
      return script.readEnv
        ? script.readEnv(key)
        : 'https://example.convex.cloud';
    },
    async spawnKimi(
      binary: string,
      args: readonly string[],
    ): Promise<{
      running: boolean;
      extension_connected: boolean;
    }> {
      spawnCalls.push({
        binary,
        args: [...args],
      });
      return script.spawnKimi
        ? await script.spawnKimi(binary, args)
        : { running: true, extension_connected: true };
    },
  };
}

describe('Phase S2 — PROBE_COMMANDS contract (exact paths)', () => {
  /**
   * PROBE_COMMANDS is the single source of truth for *which* URLs / env
   * vars / binaries the probe touches. The plan and test-strategy pin
   * the exact literals; this block makes a drift-detector test out of
   * them so a refactor that "just changes the port" or "moves the
   * health route" breaks loudly here instead of silently in production.
   */
  it('exports frontendUrl = http://localhost:5173 (Vite dev server per test-strategy)', () => {
    expect(PROBE_COMMANDS.frontendUrl).toBe('http://localhost:5173');
  });

  it('exports pivotHealthUrl = http://localhost:8081/api/health (per test-strategy)', () => {
    expect(PROBE_COMMANDS.pivotHealthUrl).toBe(
      'http://localhost:8081/api/health',
    );
  });

  it('exports convexEnvKey = "CONVEX_DEPLOYMENT" (per plan sub-task #3)', () => {
    expect(PROBE_COMMANDS.convexEnvKey).toBe('CONVEX_DEPLOYMENT');
  });

  it('exports kimiBinary path that ends with /.kimi-webbridge/bin/kimi-webbridge (per plan sub-task #3)', () => {
    expect(typeof PROBE_COMMANDS.kimiBinary).toBe('string');
    expect(PROBE_COMMANDS.kimiBinary.endsWith('/.kimi-webbridge/bin/kimi-webbridge')).toBe(true);
  });

  it('exports kimiArgs = ["status"] (per test-strategy §"Phase 2 — Dev stack health")', () => {
    expect(Array.isArray(PROBE_COMMANDS.kimiArgs)).toBe(true);
    expect([...PROBE_COMMANDS.kimiArgs]).toEqual(['status']);
  });
});

describe('Phase S2 — probeStack() contract shape', () => {
  /**
   * The plan literally specifies this shape:
   *
   *   { frontend: bool, pivot: bool, convex: bool,
   *     kimi: { running: bool, extensionConnected: bool } }
   *
   * Note: camelCase `extensionConnected` in the in-memory contract;
   * the on-disk metadata.json uses snake_case `extension_connected`
   * (see writeProbeResult tests below) to match the upstream
   * kimi-webbridge JSON wire format.
   */
  it('returns { frontend, pivot, convex, kimi.{running, extensionConnected} } shape', async () => {
    const fake = makeFakeRunner();
    const result: ProbeResult = await probeStack(fake);

    expect(typeof result.frontend).toBe('boolean');
    expect(typeof result.pivot).toBe('boolean');
    expect(typeof result.convex).toBe('boolean');
    expect(typeof result.kimi).toBe('object');
    expect(typeof result.kimi.running).toBe('boolean');
    expect(typeof result.kimi.extensionConnected).toBe('boolean');
  });

  it('returns all-true when every probe succeeds (happy path)', async () => {
    const fake = makeFakeRunner();
    const result = await probeStack(fake);

    expect(result.frontend).toBe(true);
    expect(result.pivot).toBe(true);
    expect(result.convex).toBe(true);
    expect(result.kimi.running).toBe(true);
    expect(result.kimi.extensionConnected).toBe(true);
  });

  it('emits convex=false when CONVEX_DEPLOYMENT is unset (per test-strategy: `test -n "$CONVEX_DEPLOYMENT"`)', async () => {
    const fake = makeFakeRunner({ readEnv: () => undefined });
    const result = await probeStack(fake);

    expect(result.convex).toBe(false);
  });

  it('emits convex=false when CONVEX_DEPLOYMENT is the empty string', async () => {
    const fake = makeFakeRunner({ readEnv: () => '' });
    const result = await probeStack(fake);

    expect(result.convex).toBe(false);
  });

  it('emits frontend=false when GET http://localhost:5173 fails', async () => {
    const fake = makeFakeRunner({
      httpGet: (url) => (url === 'http://localhost:5173' ? false : true),
    });
    const result = await probeStack(fake);

    expect(result.frontend).toBe(false);
    expect(result.pivot).toBe(true);
  });

  it('emits pivot=false when GET http://localhost:8081/api/health fails', async () => {
    const fake = makeFakeRunner({
      httpGet: (url) =>
        url === 'http://localhost:8081/api/health' ? false : true,
    });
    const result = await probeStack(fake);

    expect(result.pivot).toBe(false);
    expect(result.frontend).toBe(true);
  });

  it('propagates kimi.{running, extensionConnected} from the spawn result (snake→camel)', async () => {
    const fake = makeFakeRunner({
      spawnKimi: () => ({ running: true, extension_connected: false }),
    });
    const result = await probeStack(fake);

    expect(result.kimi.running).toBe(true);
    expect(result.kimi.extensionConnected).toBe(false);
  });
});

describe('Phase S2 — fake runner intercepts the exact command paths', () => {
  /**
   * Proves `probeStack()` actually calls the runner with the literal
   * PROBE_COMMANDS values — not a "smoke" test that could accidentally
   * fall back to real HTTP/spawn. This satisfies the MID prompt
   * requirement: "If testing a shell runner or fake harness, prove the
   * fake mode intercepts the exact command path."
   */
  it('invokes httpGet with http://localhost:5173 exactly once (Vite)', async () => {
    const fake = makeFakeRunner();
    await probeStack(fake);

    const viteCalls = fake.httpGetCalls.filter(
      (url) => url === 'http://localhost:5173',
    );
    expect(viteCalls.length).toBe(1);
  });

  it('invokes httpGet with http://localhost:8081/api/health exactly once (pivot)', async () => {
    const fake = makeFakeRunner();
    await probeStack(fake);

    const pivotCalls = fake.httpGetCalls.filter(
      (url) => url === 'http://localhost:8081/api/health',
    );
    expect(pivotCalls.length).toBe(1);
  });

  it('invokes readEnv with the literal key "CONVEX_DEPLOYMENT" exactly once', async () => {
    const fake = makeFakeRunner();
    await probeStack(fake);

    const convexCalls = fake.readEnvCalls.filter(
      (key) => key === 'CONVEX_DEPLOYMENT',
    );
    expect(convexCalls.length).toBe(1);
  });

  it('invokes spawnKimi exactly once with binary + ["status"] args', async () => {
    const fake = makeFakeRunner();
    await probeStack(fake);

    expect(fake.spawnCalls.length).toBe(1);
    expect(fake.spawnCalls[0]?.binary).toBe(PROBE_COMMANDS.kimiBinary);
    expect(fake.spawnCalls[0]?.args).toEqual([...PROBE_COMMANDS.kimiArgs]);
  });

  it('does NOT invoke any extra URL or env key beyond the four declared probes', async () => {
    const fake = makeFakeRunner();
    await probeStack(fake);

    // Exact set membership: every URL we called must be one of the two declared.
    const allowedUrls = new Set([
      'http://localhost:5173',
      'http://localhost:8081/api/health',
    ]);
    const unexpectedUrls = fake.httpGetCalls.filter(
      (url) => !allowedUrls.has(url),
    );
    expect(unexpectedUrls).toEqual([]);

    const allowedEnvKeys = new Set(['CONVEX_DEPLOYMENT']);
    const unexpectedEnvKeys = fake.readEnvCalls.filter(
      (key) => !allowedEnvKeys.has(key),
    );
    expect(unexpectedEnvKeys).toEqual([]);
  });
});

describe('Phase S2 — createNodeProbeRunner() production adapter', () => {
  it('exports a real ProbeRunner implementation for live probes', () => {
    const runner = createNodeProbeRunner();

    expect(typeof runner.httpGet).toBe('function');
    expect(typeof runner.readEnv).toBe('function');
    expect(typeof runner.spawnKimi).toBe('function');
  });

  it('returns false instead of throwing when the kimi binary is missing', async () => {
    const runner = createNodeProbeRunner();
    const status = await runner.spawnKimi('/path/that/does/not/exist/kimi-webbridge', [
      'status',
    ]);

    expect(status).toEqual({ running: false, extension_connected: false });
  });
});

describe('Phase S2 — formatRemediation() halt messages', () => {
  /**
   * The plan requires "Halt with a clear remediation message if any
   * probe fails (e.g., 'kimi-webbridge extension not connected — open
   * your browser and retry')". This block pins one remediation string
   * per failure mode so GREEN can't ship a generic "probe failed" toast
   * that gives the user no recovery path.
   *
   * Assertions use `toContain` against deliberately specific anchor
   * phrases so the remediation may evolve in wording but must keep
   * naming the failed subsystem and the recovery action.
   */
  it('frontend remediation mentions the Vite dev server and `npm run dev`', () => {
    const result: ProbeResult = {
      frontend: false,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: true },
    };
    const msg = formatRemediation(result);
    expect(msg).toContain('frontend');
    expect(msg).toContain('5173');
    expect(msg).toContain('npm run dev');
  });

  it('pivot remediation mentions /api/health and the pivot Bun server', () => {
    const result: ProbeResult = {
      frontend: true,
      pivot: false,
      convex: true,
      kimi: { running: true, extensionConnected: true },
    };
    const msg = formatRemediation(result);
    expect(msg).toContain('pivot');
    expect(msg).toContain('/api/health');
  });

  it('convex remediation mentions CONVEX_DEPLOYMENT', () => {
    const result: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: false,
      kimi: { running: true, extensionConnected: true },
    };
    const msg = formatRemediation(result);
    expect(msg).toContain('CONVEX_DEPLOYMENT');
  });

  it('kimi-not-running remediation mentions starting the daemon', () => {
    const result: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: false, extensionConnected: false },
    };
    const msg = formatRemediation(result);
    expect(msg).toContain('kimi-webbridge');
    // Lower-case because we anchor on the verb, not the title-case heading.
    expect(msg.toLowerCase()).toContain('not running');
  });

  it('extension-not-connected remediation matches the plan literal phrasing', () => {
    const result: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    const msg = formatRemediation(result);
    // Plan sub-task literal: "kimi-webbridge extension not connected —
    // open your browser and retry"
    expect(msg).toContain('extension not connected');
    expect(msg).toContain('browser');
  });

  it('returns an empty string when every probe is green (no remediation needed)', () => {
    const result: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: true },
    };
    expect(formatRemediation(result)).toBe('');
  });
});

describe('Phase S2 — handleKimiDisconnected() filing Q-FIND-001 and skipping S3–S5', () => {
  /**
   * Plan sub-task #5: "If `kimi` reports `extension_connected: false`,
   * file a `Q-FIND-001` finding with severity High and skip Phases
   * S3-S5 with a recorded `skipped: true` reason. Do NOT abort the
   * track — the inventory + findings infra are still useful for next
   * time."
   *
   * This block pins the exact finding shape and the skip-phase list so
   * GREEN cannot ship a "throws on disconnect" implementation that
   * fails the "do NOT abort" requirement.
   */
  it('returns a finding object with id="Q-FIND-001" and severity="High"', () => {
    const probeResult: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    const outcome = handleKimiDisconnected(probeResult);

    expect(outcome.finding.id).toBe('Q-FIND-001');
    expect(outcome.finding.severity).toBe('High');
  });

  it('finding includes a route field naming the kimi-webbridge subsystem', () => {
    const probeResult: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    const { finding } = handleKimiDisconnected(probeResult);

    // The plan finding shape is `{ id, route, element?, action, severity,
    // expected, actual, screenshotPath, reproSteps[] }` (Phase S6 spec);
    // for a non-route probe failure the route slot names the subsystem.
    expect(typeof finding.route).toBe('string');
    expect(finding.route.toLowerCase()).toContain('kimi');
  });

  it('finding describes expected/actual contrast naming "extension_connected"', () => {
    const probeResult: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    const { finding } = handleKimiDisconnected(probeResult);

    expect(typeof finding.expected).toBe('string');
    expect(typeof finding.actual).toBe('string');
    // Either field must mention the connection flag so a triager can
    // diagnose without opening the executor source.
    const combined = `${finding.expected}\n${finding.actual}`;
    expect(combined).toContain('extension_connected');
  });

  it('returns skipPhases = ["S3","S4","S5"] in declaration order', () => {
    const probeResult: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    const outcome = handleKimiDisconnected(probeResult);

    expect(outcome.skipPhases).toEqual(['S3', 'S4', 'S5']);
  });

  it('marks the outcome with skipped=true (matches plan: "recorded `skipped: true` reason")', () => {
    const probeResult: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    const outcome = handleKimiDisconnected(probeResult);

    expect(outcome.skipped).toBe(true);
    // A non-empty reason string lets the coverage report explain why
    // Phases S3–S5 didn't run.
    expect(typeof outcome.reason).toBe('string');
    expect(outcome.reason.length).toBeGreaterThan(0);
  });

  it('does NOT throw — the plan requires graceful skip, not hard abort', () => {
    const probeResult: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    expect(() => handleKimiDisconnected(probeResult)).not.toThrow();
  });
});

describe('Phase S2 — writeProbeResult() metadata.json writer', () => {
  /**
   * Plan "Generate Docs & Doctor" sub-task: "Run the probe and record
   * the result in `metadata.json.qa_probe`."
   *
   * The writer must:
   *   - Read the existing metadata.json (preserving every unrelated key)
   *   - Set `qa_probe` to the snake_case wire format
   *     (`extension_connected`, NOT `extensionConnected`) so it matches
   *     the upstream kimi-webbridge `status` JSON shape already present
   *     in metadata.json today.
   *   - Be idempotent: re-running with the same input produces
   *     byte-equal output.
   *
   * The test writes to a temp directory so it never mutates the
   * committed `measure/archive/e2e_qa_smoke_20260613/metadata.json`.
   * This satisfies the MID prompt: "Artifact or markdown assertions
   * are allowed only when the phase deliverable is that artifact" —
   * the deliverable IS metadata.json, but the live-write happens
   * against a tmp copy so the Red test is hermetic.
   */
  let tmpDir: string;
  let metadataPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'qa-executor-test-'));
    metadataPath = join(tmpDir, 'metadata.json');
    writeFileSync(
      metadataPath,
      JSON.stringify(
        {
          track_id: 'e2e_qa_smoke_20260613',
          status: 'in_progress',
          existing_field: 'preserve-me',
        },
        null,
        2,
      ),
    );
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes qa_probe with snake_case extension_connected (matches kimi-webbridge wire format)', async () => {
    const result: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    await writeProbeResult(metadataPath, result);

    const parsed = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(parsed.qa_probe).toEqual({
      frontend: true,
      pivot: true,
      convex: true,
      kimi: {
        running: true,
        extension_connected: false,
      },
    });
  });

  it('preserves every existing key in metadata.json (does NOT overwrite the file blindly)', async () => {
    const result: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: true },
    };
    await writeProbeResult(metadataPath, result);

    const parsed = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(parsed.track_id).toBe('e2e_qa_smoke_20260613');
    expect(parsed.status).toBe('in_progress');
    expect(parsed.existing_field).toBe('preserve-me');
  });

  it('is idempotent — second call with the same input produces byte-equal output', async () => {
    const result: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: true },
    };
    await writeProbeResult(metadataPath, result);
    const firstWrite = readFileSync(metadataPath, 'utf8');
    await writeProbeResult(metadataPath, result);
    const secondWrite = readFileSync(metadataPath, 'utf8');

    expect(secondWrite).toBe(firstWrite);
  });

  it('overwrites a pre-existing qa_probe field rather than merging stale flags', async () => {
    // Seed metadata.json with a stale qa_probe that has frontend=false.
    const seeded = JSON.parse(readFileSync(metadataPath, 'utf8'));
    seeded.qa_probe = {
      frontend: false,
      pivot: false,
      convex: false,
      kimi: { running: false, extension_connected: false },
    };
    writeFileSync(metadataPath, JSON.stringify(seeded, null, 2));

    // Write a fresh all-green result; the stale flags must be replaced.
    const result: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: true },
    };
    await writeProbeResult(metadataPath, result);

    const parsed = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(parsed.qa_probe.frontend).toBe(true);
    expect(parsed.qa_probe.pivot).toBe(true);
    expect(parsed.qa_probe.convex).toBe(true);
    expect(parsed.qa_probe.kimi.running).toBe(true);
    expect(parsed.qa_probe.kimi.extension_connected).toBe(true);
  });
});

describe('Phase S2 — Finding shape compatibility with Phase S6 contract', () => {
  /**
   * The plan Phase S6 declares `Finding = { id: 'Q-FIND-NNN', route,
   * element?, action, severity, expected, actual, screenshotPath,
   * reproSteps[] }`. The Q-FIND-001 produced by Phase S2 must already
   * conform — Phase S6's findings generator can't post-fill these
   * fields without losing the disconnect context.
   *
   * This block is intentionally light: it only checks that the typed
   * `Finding` re-exported by `./qa-executor` has the fields Phase S6
   * needs. It does NOT require Phase S6's findings.md aggregator to
   * exist (that lands in a later Red phase).
   */
  it('Finding type has id, route, action, severity, expected, actual, screenshotPath, reproSteps', () => {
    // Probe a Finding using `handleKimiDisconnected` so we exercise the
    // real producer rather than fabricating a Finding ourselves.
    const probeResult: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    const { finding } = handleKimiDisconnected(probeResult);

    expect(typeof finding.id).toBe('string');
    expect(typeof finding.route).toBe('string');
    expect(typeof finding.action).toBe('string');
    expect(typeof finding.severity).toBe('string');
    expect(typeof finding.expected).toBe('string');
    expect(typeof finding.actual).toBe('string');
    expect(typeof finding.screenshotPath).toBe('string');
    expect(Array.isArray(finding.reproSteps)).toBe(true);
    // reproSteps must be at least one human-readable step.
    expect((finding.reproSteps as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('Finding.id matches the literal Q-FIND-NNN regex', () => {
    const probeResult: ProbeResult = {
      frontend: true,
      pivot: true,
      convex: true,
      kimi: { running: true, extensionConnected: false },
    };
    const { finding } = handleKimiDisconnected(probeResult);

    expect(finding.id).toMatch(/^Q-FIND-\d{3}$/);
  });
});

// Type-only smoke: the imports above must resolve to *exported* symbols,
// not just `any`. This dead reference at the bottom of the file gives
// `tsc --noEmit` (and bun's loader) an additional handle to refuse if
// the GREEN module forgets to export one of the contract types.
const _typeProbe: {
  Finding: Finding;
  ProbeResult: ProbeResult;
  ProbeRunner: ProbeRunner;
} | null = null;
if (_typeProbe !== null) {
  // unreachable; keeps the unused-import flag quiet.
  console.log(_typeProbe);
}
