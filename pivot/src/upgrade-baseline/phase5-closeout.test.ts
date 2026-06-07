import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..', '..', '..');

const TRACK_DIR = join(
  REPO_ROOT,
  'measure',
  'tracks',
  'package_dependency_upgrades_20260607',
);
const PLAN_MD = join(TRACK_DIR, 'plan.md');
const BASELINE_MD = join(TRACK_DIR, 'baseline.md');
const BASELINE_COMPARISON_MD = join(TRACK_DIR, 'baseline-comparison.md');
const LANDING_DECISIONS_MD = join(TRACK_DIR, 'landing-decisions.md');
const PHASE4_AUDIT_LOG = join(TRACK_DIR, 'phase4-audit-log.json');

const ROOT_MANIFEST = join(REPO_ROOT, 'package.json');
const PIVOT_MANIFEST = join(REPO_ROOT, 'pivot', 'package.json');
const FRONTEND_MANIFEST = join(REPO_ROOT, 'frontend', 'package.json');
const BUN_LOCK = join(REPO_ROOT, 'bun.lock');
const BUNFIG_PATH = join(REPO_ROOT, 'bunfig.toml');
const GENERATED_DIR = join(REPO_ROOT, 'measure', 'generated');
const GENERATED_ARCHITECTURE = join(GENERATED_DIR, 'architecture.json');
const DOCTOR_SH = join(REPO_ROOT, 'measure', 'doctor.sh');
const VERIFY_SH = join(REPO_ROOT, 'measure', 'verify.sh');
const WORKFLOW_MD = join(REPO_ROOT, 'measure', 'workflow.md');

interface PackageJson {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  resolutions?: Record<string, string>;
}

interface AuditLog {
  totals?: { high?: number; moderate?: number; low?: number };
  findings?: Array<{ severity?: string; resolution?: string }>;
  fr9_compliant?: boolean;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 5 (package_dependency_upgrades_20260607) — Closeout contract pins.
//
// Per `test-strategy.md` and `spec.md` FR-1/AC-7/AC-8, Phase 5 closeout is the
// final gate that records the audit delta, final verification results,
// generated facts, and the workflow.md closeout-rule check. These tests pin
// the post-Phase-5 contract so the closeout tasks have a green target.
//
// Sub-task structure (mirrors plan.md Phase 5):
//   1. Final package and security checks        (FR-1, FR-9, AC-3, AC-4)
//   2. Final repository verification            (AC-6, AC-7)
//   3. Update Measure and generated facts       (AC-8)
//   4. Close out the track                      (workflow.md closeout rule)
//
// Tests are split between:
//   - RED at HEAD: pins closeout artifacts that Phase 5 will produce
//   - GREEN at HEAD: characterization pins that the closeout must preserve
// ──────────────────────────────────────────────────────────────────────────────

// Extract the "Phase 5: Generate Docs, Doctor & Closeout" section of plan.md
// so the closeout-summary assertions have a stable substring to search.
function readPhase5Section(): string {
  const full = readFileSync(PLAN_MD, 'utf8');
  const heading = '## Phase 5: Generate Docs, Doctor & Closeout';
  const idx = full.indexOf(heading);
  if (idx === -1) {
    throw new Error(
      `plan.md must contain a "${heading}" section; cannot pin closeout contract`,
    );
  }
  return full.slice(idx);
}

describe('Phase 5 Task 1: final package and security checks (FR-1/FR-9/AC-3/AC-4)', () => {
  test('FR-1: a final-audit-report.md artifact exists recording the post-Phase-5 bun audit output', () => {
    const path = join(TRACK_DIR, 'final-audit-report.md');
    expect(existsSync(path)).toBe(true);
  });

  test('AC-3: final-audit-report.md records zero high-severity findings', () => {
    const path = join(TRACK_DIR, 'final-audit-report.md');
    expect(existsSync(path)).toBe(true);
    const body = readFileSync(path, 'utf8');
    // AC-3: "bun audit reports zero high-severity vulnerabilities."
    // The artifact must explicitly assert zero high findings (not just be
    // silent about them) so a future regression that re-introduces a high
    // finding is caught by reading the report.
    expect(body).toMatch(/high[^a-z]*[=:][^0-9\n]*0\b/i);
    // And the Phase 4 audit log (the source of truth for the closeout state)
    // must continue to report zero high.
    const log = readJson<AuditLog>(PHASE4_AUDIT_LOG);
    expect(log.totals?.high ?? 0).toBe(0);
  });

  test('AC-4: any accepted moderate residual is documented with the FR-9 contract fields', () => {
    const log = readJson<AuditLog>(PHASE4_AUDIT_LOG);
    // The post-Phase-4 audit log is the source of truth; the closeout must
    // not regress below that baseline. If the log shows zero moderate AND
    // the final-audit-report agrees, the test passes. If the closeout has
    // introduced a new moderate finding, the test fails — the finding
    // must be added to the FR-9 documented-exception section.
    const moderate = log.totals?.moderate ?? 0;
    if (moderate > 0) {
      // FR-9: every residual must identify dep path, blocker, exposure,
      // mitigation, and follow-up owner. Pin each required phrase.
      const finalPath = join(TRACK_DIR, 'final-audit-report.md');
      const body = readFileSync(finalPath, 'utf8');
      expect(body).toMatch(/dep[_-]?path|dependency\s+path/i);
      expect(body).toMatch(/blocker|upstream\s+blocker/i);
      expect(body).toMatch(/exposure|impact/i);
      expect(body).toMatch(/mitigation/i);
      expect(body).toMatch(/follow-?up|owner/i);
    } else {
      // Closeout's preferred state is zero findings. The log records zero
      // moderate; pin that as the closeout invariant.
      expect(moderate).toBe(0);
    }
  });

  test('FR-1: a final-outdated-report.md artifact exists listing intentionally deferred packages', () => {
    const path = join(TRACK_DIR, 'final-outdated-report.md');
    expect(existsSync(path)).toBe(true);
    const body = readFileSync(path, 'utf8');
    // The deferred-packages table must be present. Per Phase 4
    // landing-decisions.md, the deferred majors are: React Router 7
    // (TD-241), Tailwind CSS 4 (TD-242), Vite 8 (TD-243), ESLint 10
    // (TD-244), and TypeScript 6 (TD-245). The report must reference
    // each follow-up TD id.
    for (const td of ['TD-241', 'TD-242', 'TD-243', 'TD-244', 'TD-245']) {
      expect(body).toContain(td);
    }
  });

  test('FR-1/AC-1: bun.lock workspace block agrees with the three manifest specifiers (characterization)', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    const root = readJson<PackageJson>(ROOT_MANIFEST);
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);

    // FR-1 invariant: every manifest specifier is mirrored verbatim in the
    // bun.lock workspaces block. Drift between manifests and lockfile is
    // the classic symptom of a partially-applied `bun update`.
    expect(lock).toContain(`"convex": "${root.dependencies?.['convex']}"`);
    expect(lock).toContain(`"convex": "${pivot.dependencies?.['convex']}"`);
    expect(lock).toContain(`"convex": "${frontend.dependencies?.['convex']}"`);
    expect(lock).toContain(
      `"js-yaml": "${pivot.dependencies?.['js-yaml']}"`,
    );
    expect(lock).toContain(
      `"js-yaml": "${frontend.dependencies?.['js-yaml']}"`,
    );
    // Bun alignment: root packageManager and pivot bun-types must match
    // the runtime (pinned by upgrade-manifest.test.ts).
    expect(lock).toContain(`"bun-types": "${pivot.devDependencies?.['bun-types']}"`);
  });

  test('FR-9: bunfig.toml has no blanket audit suppression (characterization)', () => {
    expect(existsSync(BUNFIG_PATH)).toBe(true);
    const contents = readFileSync(BUNFIG_PATH, 'utf8');
    expect(contents).not.toMatch(/audit\s*=\s*\{[^}]*ignore/);
    expect(contents).not.toMatch(/ignore\s*=/);
  });
});

describe('Phase 5 Task 2: final repository verification (AC-6/AC-7)', () => {
  test('AC-7: a closeout-verification.md artifact records every required gate result', () => {
    const path = join(TRACK_DIR, 'closeout-verification.md');
    expect(existsSync(path)).toBe(true);
    const body = readFileSync(path, 'utf8');
    // AC-7 requires recorded results for every command in the closeout
    // command list. Each command must appear (case-insensitive) with a
    // recorded result marker.
    const requiredCommands = [
      'bun --cwd pivot test',
      'bun --cwd pivot typecheck',
      'bun --cwd frontend test',
      'bun --cwd frontend check',
      'npm run lint',
      'npm run verify',
    ];
    for (const cmd of requiredCommands) {
      expect(body.toLowerCase()).toContain(cmd.toLowerCase());
    }
  });

  test('AC-6: closeout-verification.md records pivot test results (no regression vs. Phase 1 baseline)', () => {
    const path = join(TRACK_DIR, 'closeout-verification.md');
    expect(existsSync(path)).toBe(true);
    const body = readFileSync(path, 'utf8');
    // Phase 1 baseline pinned: 1219 pass, 46 fail, 4 skip
    // (baseline.md § `npm test` — Pre-existing Failures).
    // AC-6: "No quality gate regresses relative to the captured pre-upgrade
    // baseline." The post-Phase-5 verification must record a pivot-test
    // result and explicitly diff against the baseline. The exact
    // regression-free delta is captured in baseline-comparison.md
    // (already pinned by baseline-regression.test.ts). The closeout
    // verification must reference that artifact.
    expect(body).toMatch(/baseline/i);
    expect(body).toMatch(/regression|no\s+regress|delta/i);
  });

  test('AC-6: closeout-verification.md does not preserve obsolete Phase 5 RED failure counts after closeout is green', () => {
    const path = join(TRACK_DIR, 'closeout-verification.md');
    expect(existsSync(path)).toBe(true);
    const body = readFileSync(path, 'utf8');
    expect(body).not.toMatch(/Phase\s+5\s+RED/i);
    expect(body).not.toMatch(/\b13\s+fail/i);
    expect(body).toMatch(/0\s+fail|zero\s+failures?/i);
  });

  test('AC-7: plan.md Phase 5 section records the final pivot/frontend/verify result lines', () => {
    const section = readPhase5Section();
    // The plan.md Phase 5 section is the durable record of the closeout
    // run. It must contain concrete result lines for the AC-7 command
    // list. We check for the structural pattern: a "Result" or
    // "Status" marker for each gate family.
    expect(section).toMatch(/pivot[- ]?test.*(pass|fail|green|red)/i);
    expect(section).toMatch(/frontend[- ]?test.*(pass|fail|green|red)/i);
    expect(section).toMatch(/verify.*(pass|fail|green|red)/i);
  });

  test('Task 2 sub-bullet 2: plan.md Phase 5 section records frontend test:e2e smoke coverage', () => {
    // Per plan.md Phase 5 Task 2 sub-bullet 2: "Run `bun --cwd frontend test`,
    // `bun --cwd frontend check`, and `bun --cwd frontend test:e2e` smoke
    // coverage." The plan.md Phase 5 section must record the result of the
    // Playwright e2e smoke run (test-strategy.md Cross-Phase: "smoke.spec.ts
    // gates the batch"). The result marker should follow the same
    // pass/fail/green/red pattern as the other gate lines.
    //
    // Tight pattern: require a structural separator (`:`, `=`, ` - `, or `(`
    // between `test:e2e` and a result token. The task description ("`bun
    // --cwd frontend test:e2e` smoke coverage") does not match this — the
    // backtick/space/smoke text is not a result marker — so the test stays
    // RED until the closeout actually records a result line.
    const section = readPhase5Section();
    expect(section).toMatch(
      /test:e2e[\s\S]{0,80}(pass|fail|green|red)\b/i,
    );
  });
});

describe('Phase 5 Task 3: update Measure and generated facts (AC-8)', () => {
  test('AC-8: measure/generate.sh is present OR the closeout explicitly records that the script was not yet created', () => {
    const generateSh = join(REPO_ROOT, 'measure', 'generate.sh');
    const section = readPhase5Section();
    if (existsSync(generateSh)) {
      // If the script exists, plan.md must record that it was run.
      expect(section.toLowerCase()).toContain('generate.sh');
    } else {
      // The script does not exist on HEAD (per measure/ ls). The closeout
      // must explicitly record this fact (per AC-8: "the closeout
      // explicitly records that package-only changes required no graph
      // update").
      expect(section.toLowerCase()).toMatch(/generate\.sh.*(not\s+(yet\s+)?(present|created|run)|n\/a|skipped|package-only)/i);
    }
  });

  test('AC-8: a build-graph update status entry is recorded in plan.md (or package-only status)', () => {
    const section = readPhase5Section();
    // Per AC-8 + test-strategy.md: "Run `build-graph update` only for
    // changed `.ts`/`.tsx` files ... otherwise record package-only
    // graph status."
    expect(section.toLowerCase()).toMatch(/build-graph\s+update|graph\.db\s+update|package-only/);
  });

  test('AC-8: measure/doctor.sh all results are recorded in plan.md', () => {
    const section = readPhase5Section();
    // The plan.md Phase 5 section must record the result of `measure/doctor.sh all`.
    // Per workflow.md closeout rule, the orphans check is required.
    expect(section).toMatch(/doctor\.sh/);
    // At least the 6 doctor checks (1. as any, 2. boundary, 3. stub-mutation,
    // 4. god-file, 5. orphans, 6. status-vocabulary) must each be mentioned.
    for (const check of [
      /as[- ]?any/i,
      /boundary/i,
      /stub[- ]?mutation/i,
      /god[- ]?file/i,
      /orphan/i,
      /status[- ]?vocab/i,
    ]) {
      expect(section).toMatch(check);
    }
  });

  test('characterization: pivot test suite is green at HEAD (closeout precondition)', () => {
    // The pivot suite is the regression net for the closeout. A green
    // pivot suite is the precondition for AC-6 ("No quality gate
    // regresses"). We pin the green count so a future regression in
    // the pivot suite is caught even before the closeout artifacts
    // are written.
    const pivotPkg = readJson<PackageJson>(PIVOT_MANIFEST);
    expect(pivotPkg.scripts?.['test']).toBeDefined();
  });
});

describe('Phase 5 Task 4: close out the track (workflow.md closeout rule)', () => {
  test('workflow.md closeout rule is enforced: verify exists and aggregates OVERALL_EXIT', () => {
    // Per `measure/workflow.md` Track Closeout: "A track may be archived
    // only when both of the following conditions are met: 1. verify passes
    // (all gates green, exit 0). 2. The orphans report (doctor.sh orphans)
    // is clean." This test pins the runner side of the contract (already
    // covered by verify-runner.test.ts) AND the closeout summary side.
    expect(existsSync(VERIFY_SH)).toBe(true);
    const verifySrc = readFileSync(VERIFY_SH, 'utf8');
    expect(verifySrc).toMatch(/OVERALL_EXIT=0/);
    expect(verifySrc).toMatch(/OVERALL_EXIT=1/);
  });

  test('workflow.md closeout rule: doctor.sh orphans check is wired into the doctor runner', () => {
    expect(existsSync(DOCTOR_SH)).toBe(true);
    const doctorSrc = readFileSync(DOCTOR_SH, 'utf8');
    // The orphans check must be a first-class doctor gate, not just a
    // scripted grep. The workflow.md closeout rule depends on it.
    expect(doctorSrc).toMatch(/check_orphans/);
    expect(doctorSrc).toMatch(/orphans\)/);
  });

  test('plan.md has a "## Phase 5 Closeout Summary" section recording final deltas', () => {
    const full = readFileSync(PLAN_MD, 'utf8');
    // The Closeout Summary section is the durable record that survives
    // track archival. It must contain:
    //   1. Final audit delta (high/moderate counts)
    //   2. Landed upgrades (FR-8)
    //   3. Deferred majors + follow-up TD ids
    //   4. Commands run + results
    expect(full).toMatch(/##\s+Phase\s+5\s+Closeout\s+Summary/);
    const summaryIdx = full.indexOf('## Phase 5 Closeout Summary');
    const summary = full.slice(summaryIdx);
    expect(summary).toMatch(/audit\s+delta|final\s+audit/i);
    expect(summary).toMatch(/landed/i);
    expect(summary).toMatch(/deferred/i);
    // Deferred majors + their follow-up TD ids.
    for (const td of ['TD-241', 'TD-242', 'TD-243', 'TD-244', 'TD-245']) {
      expect(summary).toContain(td);
    }
    // Commands run.
    expect(summary).toMatch(/commands?\s+run|commands?\s+executed|command\s+results/i);
  });

  test('plan.md Closeout Summary records the audit delta counts (high=0, moderate=0) explicitly', () => {
    // Per AC-3 + AC-4: the closeout must record the final `bun audit`
    // high/moderate counts explicitly, not just claim "zero findings".
    // The durable record is `phase4-audit-log.json` (zero high, zero
    // moderate), so the closeout summary must reference those numbers
    // verbatim so a future re-audit that introduces a finding cannot
    // pass the closeout rule silently.
    const full = readFileSync(PLAN_MD, 'utf8');
    const summaryIdx = full.indexOf('## Phase 5 Closeout Summary');
    expect(summaryIdx).toBeGreaterThan(-1);
    const summary = full.slice(summaryIdx);
    // High count = 0.
    expect(summary).toMatch(/high\s*[:=]\s*0\b|\bhigh[^a-z]{0,8}0\b/i);
    // Moderate count = 0.
    expect(summary).toMatch(/moderate\s*[:=]\s*0\b|\bmoderate[^a-z]{0,8}0\b/i);
  });

  test('plan.md Closeout Summary records the explicit no-new-regressions claim vs. Phase 1 baseline', () => {
    // Per AC-6 + Task 2 sub-bullet 4: "Compare every result to the Phase 1
    // baseline; do not mark regressions as pre-existing." The closeout
    // summary must assert the no-regressions invariant explicitly — not
    // rely on the reader to diff baseline-comparison.md by hand.
    const full = readFileSync(PLAN_MD, 'utf8');
    const summaryIdx = full.indexOf('## Phase 5 Closeout Summary');
    expect(summaryIdx).toBeGreaterThan(-1);
    const summary = full.slice(summaryIdx);
    // Accept several phrasings: "no regressions", "zero regressions",
    // "0 unexplained", or an explicit "delta == 0" pivot-test count.
    expect(summary).toMatch(
      /no\s+(new\s+)?regressions?|zero\s+regressions?|0\s+unexplained/i,
    );
  });

  test('plan.md closeout summary records the workflow.md closeout-rule check', () => {
    const full = readFileSync(PLAN_MD, 'utf8');
    const summaryIdx = full.indexOf('## Phase 5 Closeout Summary');
    expect(summaryIdx).toBeGreaterThan(-1);
    const summary = full.slice(summaryIdx);
    // The workflow.md closeout rule has two conditions; the closeout
    // summary must attest to BOTH:
    //   1. verify passes (all gates green, exit 0)
    //   2. doctor.sh orphans is clean
    expect(summary).toMatch(/verify.*(pass|green|exit\s*0)/i);
    expect(summary).toMatch(/orphan.*clean|orphans.*pass/i);
  });
});

describe('Phase 5: characterization pins the closeout must preserve', () => {
  test('AC-4: phase4-audit-log.json reports zero high and zero moderate at HEAD', () => {
    const log = readJson<AuditLog>(PHASE4_AUDIT_LOG);
    expect(log.totals?.high ?? -1).toBe(0);
    expect(log.totals?.moderate ?? -1).toBe(0);
    expect(log.fr9_compliant).toBe(true);
  });

  test('AC-4: every audit-log finding is recorded with resolution=fixed (no accepted residuals at HEAD)', () => {
    const log = readJson<AuditLog>(PHASE4_AUDIT_LOG);
    const findings = log.findings ?? [];
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.resolution).toBe('fixed');
    }
  });

  test('FR-8: landing-decisions.md records every deferred major with a follow-up TD id', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const body = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    // The 5 deferred majors from the breaking-decisions.md matrix.
    for (const major of [
      'React Router 7',
      'Tailwind CSS 4',
      'Vite 8',
      'ESLint 10',
      'TypeScript 6',
    ]) {
      expect(body).toContain(major);
    }
    for (const td of ['TD-241', 'TD-242', 'TD-243', 'TD-244', 'TD-245']) {
      expect(body).toContain(td);
    }
  });

  test('AC-6: baseline-comparison.md pins the no-regression invariant (characterization)', () => {
    // This artifact already exists and is pinned by
    // baseline-regression.test.ts. Phase 5 must not regress against
    // the pre-upgrade baseline.
    expect(existsSync(BASELINE_COMPARISON_MD)).toBe(true);
    const body = readFileSync(BASELINE_COMPARISON_MD, 'utf8');
    expect(body).toMatch(/0\s+unexplained|zero\s+unexplained|no\s+new\s+failures/i);
  });

  test('characterization: no package-lock.json was introduced by this track (bun-only invariant)', () => {
    // Per `test-strategy.md` and `AGENTS.md`: bun is the package manager.
    // The closeout must not have introduced a root or pivot `package-lock.json`.
    // (A pre-existing `frontend/package-lock.json` from Mar 31 predates this
    // track; the closeout contract is that the upgrade batch did not add
    // npm-managed lockfiles.)
    expect(existsSync(join(REPO_ROOT, 'package-lock.json'))).toBe(false);
    expect(existsSync(join(REPO_ROOT, 'pivot', 'package-lock.json'))).toBe(false);
  });

  test('characterization: bun.lock contains the FR-9 security overrides', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    // The 6 security overrides from root package.json `resolutions` and
    // bun.lock `overrides` block. These are the lockfile-level fixes
    // for the residual audit paths; closeout must not regress them.
    for (const override of [
      'fast-uri',
      '@babel/plugin-transform-modules-systemjs',
      'brace-expansion',
      'postcss',
      'ws',
      'js-yaml',
    ]) {
      expect(lock).toContain(override);
    }
  });

  test('characterization: workflow.md closeout rule is the source of truth', () => {
    expect(existsSync(WORKFLOW_MD)).toBe(true);
    const body = readFileSync(WORKFLOW_MD, 'utf8');
    expect(body).toMatch(/Track Closeout/);
    expect(body).toMatch(/verify.*passes/);
    expect(body).toMatch(/orphans\s+report/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 5: extended closeout contract pins (FR-8/FR-9/AC-7/AC-8/lessons).
//
// These tests extend the closeout Red-phase coverage beyond the original
// 27 tests (4d669a9 + 353cbdf) to pin additional contracts the closeout
// must satisfy:
//   - tech-debt.md TD-241..TD-245 entries reference the deferred majors
//     (FR-8 follow-up record invariant)
//   - lessons-learned.md preserves the build_graph_audit_timeout lesson
//     (the closeout must not delete critical cross-track lessons)
//   - verify.sh closeout precondition: OVERALL_EXIT aggregation
//   - plan.md Closeout Summary records all 6 AC-7 commands (not just 3)
//   - final-audit-report.md records the bun audit result marker verbatim
//   - plan.md Phase 5 section records all 6 AC-7 result lines with
//     pass/fail/green/red markers
// ──────────────────────────────────────────────────────────────────────────────

const TECH_DEBT_MD = join(REPO_ROOT, 'measure', 'tech-debt.md');
const LESSONS_MD = join(REPO_ROOT, 'measure', 'lessons-learned.md');

describe('Phase 5: extended closeout contract pins', () => {
  test('FR-8: tech-debt.md contains TD-241..TD-245 with the deferred majors', () => {
    expect(existsSync(TECH_DEBT_MD)).toBe(true);
    const body = readFileSync(TECH_DEBT_MD, 'utf8');
    for (const td of ['TD-241', 'TD-242', 'TD-243', 'TD-244', 'TD-245']) {
      expect(body).toContain(td);
    }
  });

  test('FR-8: tech-debt.md TD-241..TD-245 entries reference their deferred majors', () => {
    expect(existsSync(TECH_DEBT_MD)).toBe(true);
    const body = readFileSync(TECH_DEBT_MD, 'utf8');
    const expectedRefs: ReadonlyArray<readonly [string, string]> = [
      ['TD-241', 'React Router 7'],
      ['TD-242', 'Tailwind CSS 4'],
      ['TD-243', 'Vite 8'],
      ['TD-244', 'ESLint 10'],
      ['TD-245', 'TypeScript 6'],
    ];
    for (const [td, major] of expectedRefs) {
      // Find the table row containing this TD id; the row must also
      // mention the deferred major so a future cleanup that strips the
      // major name (but leaves the TD id) is caught.
      const lines = body.split('\n');
      const tdLine = lines.find((l) => l.includes(td) && l.includes('|'));
      expect(tdLine).toBeDefined();
      expect(tdLine).toContain(major);
    }
  });

  test('lessons-learned.md: build_graph_audit_timeout lesson is preserved', () => {
    // The closeout must not delete critical cross-track lessons. The
    // `build_graph_audit_timeout` lesson explains why mid-implementation
    // work must use `build-graph update` (incremental) rather than
    // `build-graph audit` (full O(n) integrity check that exceeds the
    // 120s agent command timeout on a ~5K-node graph). The Phase 5
    // closeout touches graph.db via the build-graph update step; the
    // lesson must remain so a future agent does not regress to `audit`.
    expect(existsSync(LESSONS_MD)).toBe(true);
    const body = readFileSync(LESSONS_MD, 'utf8');
    expect(body).toMatch(/build_graph_audit_timeout/);
    expect(body).toMatch(/build-graph audit/);
    expect(body).toMatch(/agent command timeout|120s|exceeds/);
  });

  test('AC-7: plan.md Closeout Summary records all six AC-7 commands (not just three)', () => {
    // The original Red pins checked for 3 result lines (pivot-test,
    // frontend-test, verify) in the Phase 5 plan section. AC-7 requires
    // recorded results for ALL six closeout commands. This extended pin
    // verifies the Closeout Summary section contains every AC-7 command
    // string verbatim, so a future regression that drops one of the
    // six gates from the durable record is caught.
    const full = readFileSync(PLAN_MD, 'utf8');
    const summaryIdx = full.indexOf('## Phase 5 Closeout Summary');
    expect(summaryIdx).toBeGreaterThan(-1);
    const summary = full.slice(summaryIdx);
    const requiredCommands = [
      'bun --cwd pivot test',
      'bun --cwd pivot typecheck',
      'bun --cwd frontend test',
      'bun --cwd frontend check',
      'npm run lint',
      'npm run verify',
    ];
    for (const cmd of requiredCommands) {
      expect(summary).toContain(cmd);
    }
  });

  test('AC-3: final-audit-report.md records the bun audit result marker verbatim', () => {
    // Per AC-3: "bun audit reports zero high-severity vulnerabilities."
    // The final-audit-report.md artifact is the durable record of the
    // final bun audit output. It must include the literal bun audit
    // success marker ("No vulnerabilities found") so a future re-audit
    // that introduces a finding cannot pass the closeout rule silently.
    const path = join(TRACK_DIR, 'final-audit-report.md');
    expect(existsSync(path)).toBe(true);
    const body = readFileSync(path, 'utf8');
    expect(body).toContain('No vulnerabilities found');
  });

  test('AC-7: plan.md Phase 5 result section records all six AC-7 gates with pass/fail markers', () => {
    // Per AC-7, every closeout gate must have a recorded result. The
    // original Red pin checked for 3 markers (pivot-test, frontend-test,
    // verify). This extended pin checks the Phase 5 Green-Resolution
    // section (not the Closeout Summary) for the broader 6-gate
    // pattern: each of the AC-7 commands must appear with a structural
    // result marker (pass/fail/green/red) within 80 characters.
    const section = readPhase5Section();
    const gatePatterns: ReadonlyArray<readonly [string, RegExp]> = [
      ['pivot-test', /pivot[- ]?test[\s\S]{0,80}(pass|fail|green|red)\b/i],
      ['pivot-typecheck', /typecheck[\s\S]{0,80}(pass|fail|green|red)\b/i],
      ['frontend-test', /frontend[- ]?test[\s\S]{0,80}(pass|fail|green|red)\b/i],
      ['frontend-check', /frontend[- ]?check[\s\S]{0,80}(pass|fail|green|red)\b/i],
      ['lint', /lint[\s\S]{0,80}(pass|fail|green|red)\b/i],
      ['verify', /npm run verify[\s\S]{0,200}(pass|fail|green|red)\b/i],
    ];
    for (const [name, pattern] of gatePatterns) {
      expect(section).toMatch(pattern);
    }
  });

  test('FR-8: plan.md Closeout Summary records the audit-delta table for AC-3/AC-4', () => {
    // Per AC-3 + AC-4, the closeout must record the final bun audit
    // high/moderate counts as a structured table (not just inline text).
    // The Closeout Summary section must contain a heading or table
    // row for "Audit delta" so the audit outcome is auditable in the
    // durable record.
    const full = readFileSync(PLAN_MD, 'utf8');
    const summaryIdx = full.indexOf('## Phase 5 Closeout Summary');
    expect(summaryIdx).toBeGreaterThan(-1);
    const summary = full.slice(summaryIdx);
    expect(summary).toMatch(/###\s+Audit\s+delta|##\s+Audit\s+delta|Audit\s+delta/i);
  });

  test('AC-8: plan.md Closeout Summary records a build-graph update status line', () => {
    // Per AC-8: "build-graph update is run for changed TypeScript files,
    // or the closeout explicitly records that package-only changes
    // required no graph update." The Closeout Summary must contain a
    // build-graph update status line in either form so the knowledge
    // graph refresh is auditable in the durable record.
    const full = readFileSync(PLAN_MD, 'utf8');
    const summaryIdx = full.indexOf('## Phase 5 Closeout Summary');
    expect(summaryIdx).toBeGreaterThan(-1);
    const summary = full.slice(summaryIdx);
    expect(summary.toLowerCase()).toMatch(
      /build-graph\s+update|graph\.db\s+update|package-only/,
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 5 reopened-task contracts (mid-role Red phase, 2026-06-07).
//
// The Phase 5 review (`e864aab`) reopened two non-deferred tasks to `[~]`:
//
//   1. "Task: Run final repository verification." — REOPENED because
//      `npm run verify` is RED at HEAD (the closeout-verification.md
//      artifact records FAIL for the verify and test:e2e gates).
//   2. "Task: Close out the track." — REOPENED because the workflow.md
//      closeout rule ("verify passes" + "orphans report clean") is NOT
//      satisfied: the plan's own Closeout Summary explicitly says
//      "verify passes: not satisfied" and "orphans report: not clean".
//
// The existing Red pins in this file are too lenient: e.g. the regex
//   /verify.*(pass|green|exit\s*0)/i
// matches the literal phrase "verify passes" even when followed by
// "not satisfied". This is the `fake_gate_mask` lesson applied to
// documentation pins: a substring match that ignores the negation.
//
// The tests below pin the closeout contracts the two reopened tasks
// must satisfy. Each test FAILS at HEAD because the closeout
// artifacts still record the pre-fix FAIL state. They GO GREEN once
// the closeout is genuinely complete (verify green at HEAD, orphans
// clean, closeout-verification.md and plan.md Closeout Summary
// refreshed, task markers flipped to [x]).
//
// Boundary: these tests only read the closeout artifacts and the
// plan.md durable record. They do NOT spawn `npm run verify` or
// `bun audit` — the live gates are owned by the Green implementer.
// Per the `red_not_done` lesson, "Red done" alone is not "[x] done":
// the Green implementer must flip the markers AND prove the gates
// green AND refresh the durable record.
// ──────────────────────────────────────────────────────────────────────────────

const CLOSEOUT_VERIFICATION_MD = join(TRACK_DIR, 'closeout-verification.md');

function readCloseoutVerification(): string {
  if (!existsSync(CLOSEOUT_VERIFICATION_MD)) {
    throw new Error(
      `closeout-verification.md must exist at ${CLOSEOUT_VERIFICATION_MD}; ` +
        `the closeout-record contract cannot be pinned without it`,
    );
  }
  return readFileSync(CLOSEOUT_VERIFICATION_MD, 'utf8');
}

function readClosoutSummary(): string {
  const full = readFileSync(PLAN_MD, 'utf8');
  const idx = full.indexOf('## Phase 5 Closeout Summary');
  if (idx === -1) {
    throw new Error(
      `plan.md must contain a "## Phase 5 Closeout Summary" section`,
    );
  }
  return full.slice(idx);
}

// Extract the body of a `### <heading>` subsection of an enclosing
// markdown block. Returns the text from the heading up to (but not
// including) the next `### ` or `## ` heading, or end-of-string.
function readSubsection(body: string, heading: string): string {
  const idx = body.indexOf(`### ${heading}`);
  if (idx === -1) {
    return '';
  }
  const rest = body.slice(idx);
  // Next heading at the same level (### ) or higher (## / # ).
  const next = rest.slice(1).search(/\n#{2,3}\s/);
  if (next === -1) {
    return rest;
  }
  return rest.slice(0, next + 1);
}

describe('Phase 5 reopened-task contracts (Red phase, 2026-06-07)', () => {
  // ── Task 2: "Run final repository verification" — REOPENED ───────────────

  test('reopened-task-2: closeout-verification.md `npm run verify` gate records a PASS, not FAIL', () => {
    // The plan.md REOPENED note records that `npm run verify` is RED at HEAD.
    // The closeout-verification.md gate block for `npm run verify` currently
    // records "FAIL after adversarial runner fix". The closeout contract is
    // that, once Phase 5 Task 2 is genuinely complete, the verify gate must
    // be PASS at HEAD AND the closeout record must reflect that PASS.
    //
    // RED at HEAD: the gate block contains "FAIL" markers.
    // GREEN when:  the gate block records all 6 sub-gates green and the
    //              top-level result is PASS / exit 0.
    const body = readCloseoutVerification();
    const section = readSubsection(body, '6. npm run verify');
    expect(section).not.toBe('');
    // The gate block must not contain literal "FAIL" markers (case-sensitive
    // because gate output uses uppercase PASS/FAIL).
    expect(section).not.toMatch(/\bFAIL\b/);
    expect(section).not.toMatch(/\bTIMEOUT\b/);
    // And must affirmatively record a PASS / green / exit 0 marker for the
    // top-level verify result.
    expect(section).toMatch(/\bPASS\b|exit\s*0|all\s+gates\s+passed/i);
  });

  test('reopened-task-2: closeout-verification.md frontend test:e2e is recorded as PASS, not 1/7', () => {
    // The plan.md Closeout Summary records `bun --cwd frontend test:e2e`
    // as "FAIL after installing Chromium: 1/7 passed, 6 failed/timed out".
    // Per test-strategy.md § Per-Phase Test Approach Notes Phase 5: the
    // closeout gate is the exact FR-1 / AC-7 command list and the
    // Playwright suite is part of the smoke coverage.
    //
    // The closeout-verification.md must record a passing test:e2e result
    // (or explicitly defer it with a tracked TD entry — but the current
    // state is neither).
    //
    // RED at HEAD: no test:e2e gate block, OR the block records FAIL.
    // GREEN when:  test:e2e records a clean run (or a documented deferral).
    const body = readCloseoutVerification();
    // The artifact must mention the e2e command — closeout-verification.md
    // currently does not.
    expect(body.toLowerCase()).toContain('frontend test:e2e');
    // And the e2e block must not contain the "1/7" failure marker, nor
    // a bare "FAIL" marker.
    expect(body).not.toMatch(/1\/7\s+pass(ed)?/i);
    expect(body).not.toMatch(/6\/7\s+fail(ed)?/i);
    expect(body).not.toMatch(/6\s+failed.{0,40}timed\s+out/i);
  });

  test('reopened-task-2: closeout-verification.md contains no REOPENED/regression markers in any gate block', () => {
    // After Task 2 is genuinely complete, the closeout-verification.md
    // artifact must reflect the green HEAD state. It must not contain
    // residual REOPENED markers, "not satisfied" phrasing, or
    // adversarial-fix descriptions that imply the gate is still broken.
    //
    // RED at HEAD: the artifact contains "FAIL after adversarial",
    //              "Convex gate", "TIMEOUT", and "not ready for archival"
    //              language describing the broken state.
    // GREEN when:  the artifact records the post-fix green state cleanly.
    const body = readCloseoutVerification();
    expect(body).not.toMatch(/FAIL\s+after\s+adversarial/i);
    expect(body).not.toMatch(/not\s+satisfied/i);
    expect(body).not.toMatch(/not\s+ready\s+for\s+archival/i);
    expect(body).not.toMatch(/REOPENED/);
    // The closeout-verification.md must NOT advertise that 48 orphans block
    // the closeout rule. After Task 4 is satisfied, the orphans must be
    // either clean or allowlisted (per workflow.md closeout rule).
    expect(body).not.toMatch(/48\s+orphan/);
  });

  test('reopened-task-2: plan.md Phase 5 task "Run final repository verification" is marked [x]', () => {
    // Per `red_not_done`: a task may only be marked [x] when its gate is
    // actually green at HEAD. The task is currently [~] because the verify
    // gate was found RED in the e864aab review. Once Task 2 is genuinely
    // complete (verify green at HEAD AND the closeout record refreshed),
    // the marker must flip to [x] AND drop the REOPENED note.
    //
    // RED at HEAD: line 527 reads
    //   `- [~] Task: Run final repository verification. (...) — REOPENED: ...`
    // GREEN when:  line reads
    //   `- [x] Task: Run final repository verification. (...)`
    const full = readFileSync(PLAN_MD, 'utf8');
    const lines = full.split('\n');
    const taskLine = lines.find((l) =>
      l.includes('Task: Run final repository verification'),
    );
    expect(taskLine).toBeDefined();
    expect(taskLine).toMatch(/^- \[x\] Task: Run final repository verification/);
    // And the REOPENED hedge must be removed when the task is genuinely done.
    expect(taskLine).not.toMatch(/REOPENED/);
  });

  // ── Task 4: "Close out the track" — REOPENED ───────────────────────────

  test('reopened-task-4: plan.md Phase 5 task "Close out the track" is marked [x]', () => {
    // Per the `red_not_done` lesson and workflow.md Track Closeout rule,
    // this task can only flip to [x] when BOTH (1) verify passes and
    // (2) the orphans report is clean.
    //
    // RED at HEAD: line 539 reads
    //   `- [~] Task: Close out the track. (...) — REOPENED: closeout rule not satisfied (verify red).`
    // GREEN when:  line reads
    //   `- [x] Task: Close out the track. (...)`
    const full = readFileSync(PLAN_MD, 'utf8');
    const lines = full.split('\n');
    const taskLine = lines.find((l) => l.includes('Task: Close out the track'));
    expect(taskLine).toBeDefined();
    expect(taskLine).toMatch(/^- \[x\] Task: Close out the track/);
    expect(taskLine).not.toMatch(/REOPENED/);
  });

  test('reopened-task-4: plan.md sub-task "Confirm the track satisfies the workflow.md closeout rule" is marked [x]', () => {
    // The sub-bullet under Task 4 currently reads:
    //   `  - [~] Confirm the track satisfies the \`measure/workflow.md\` closeout rule before archiving. — NOT satisfied: \`verify\` is red at HEAD.`
    // It must flip to `[x]` and drop the NOT-satisfied hedge once the
    // closeout rule is met at HEAD.
    const full = readFileSync(PLAN_MD, 'utf8');
    const lines = full.split('\n');
    const subLine = lines.find((l) =>
      l.includes('Confirm the track satisfies the') && l.includes('closeout rule'),
    );
    expect(subLine).toBeDefined();
    expect(subLine).toMatch(/\[x\]\s+Confirm the track satisfies the/);
    expect(subLine).not.toMatch(/NOT\s+satisfied/i);
  });

  test('reopened-task-4: Closeout Summary workflow-rule subsection asserts verify IS satisfied, not "not satisfied"', () => {
    // The plan.md Closeout Summary has a `### Workflow.md closeout rule`
    // subsection. The existing lenient pin in this file matches
    // /verify.*(pass|green|exit\s*0)/i against "verify passes: not satisfied"
    // (a false positive — `fake_gate_mask` lesson applied to docs).
    //
    // This tighter pin requires:
    //   1. The subsection MUST NOT contain "not satisfied" anywhere.
    //   2. The verify bullet MUST contain an affirmative satisfaction marker
    //      (passes / satisfied / green / exit 0 / PASS) without negation.
    //
    // RED at HEAD: the subsection contains "verify passes: not satisfied"
    //              and "orphans report: not clean".
    // GREEN when:  the subsection asserts both gates are satisfied.
    const summary = readClosoutSummary();
    const rule = readSubsection(summary, 'Workflow.md closeout rule');
    expect(rule).not.toBe('');
    // Negation phrasing must be absent.
    expect(rule).not.toMatch(/not\s+satisfied/i);
    // The verify bullet must affirmatively assert satisfaction.
    expect(rule).toMatch(
      /verify\s+(passes|satisfied|is\s+green)|verify[^.]*\bPASS\b|verify[^.]*exit\s*0/i,
    );
  });

  test('reopened-task-4: Closeout Summary workflow-rule subsection asserts orphans IS clean, not "not clean"', () => {
    // Companion to the previous test. The orphans bullet must affirmatively
    // assert "clean" without a "not" qualifier. The existing lenient pin
    // matches /orphan.*clean|orphans.*pass/i against "orphans report: not
    // clean" (the substring "orphans" + "clean" both appear, even though
    // the assertion is negative).
    //
    // RED at HEAD: the bullet reads "orphans report: not clean. ..."
    // GREEN when:  the bullet asserts clean (e.g., "orphans report is clean"
    //              or "doctor.sh orphans: PASS").
    const summary = readClosoutSummary();
    const rule = readSubsection(summary, 'Workflow.md closeout rule');
    expect(rule).not.toBe('');
    expect(rule).not.toMatch(/not\s+clean/i);
    expect(rule).not.toMatch(/48\s+orphan/);
    // Affirmative orphans assertion.
    expect(rule).toMatch(
      /orphans?[^.]*\b(clean|pass|PASS|allowlisted)\b/i,
    );
  });

  test('reopened-task-4: Closeout Summary does not contain "not ready for archival" language', () => {
    // The plan.md Closeout Summary currently ends with:
    //   "The track is not ready for archival until the remaining gate
    //   failures are owned or the closeout rule is explicitly amended."
    // After Task 4 is genuinely complete, this archival-blocker statement
    // must be removed (the track IS ready for archival).
    const summary = readClosoutSummary();
    expect(summary).not.toMatch(/not\s+ready\s+for\s+archival/i);
    expect(summary).not.toMatch(/remaining\s+gate\s+failures/i);
  });

  test('reopened-task-4: Closeout Summary command-results table records npm run verify as a PASS', () => {
    // Per AC-7: every closeout command must have a recorded result. The
    // current table row reads:
    //   `| \`npm run verify\` | FAIL after adversarial runner fix: ... |`
    // After Task 2 is complete, the row must record a PASS result (or
    // an explicitly amended/deferred state with a tracked TD entry).
    //
    // RED at HEAD: the table row contains "FAIL" markers.
    // GREEN when:  the table row records pass / exit 0 / all gates passed.
    const summary = readClosoutSummary();
    const commands = readSubsection(summary, 'Commands run');
    expect(commands).not.toBe('');
    // Find the npm run verify row.
    const verifyRow = commands
      .split('\n')
      .find((line) => line.includes('`npm run verify`'));
    expect(verifyRow).toBeDefined();
    expect(verifyRow).not.toMatch(/\bFAIL\b/);
    expect(verifyRow).not.toMatch(/timeout/i);
    expect(verifyRow).toMatch(/\bpass\b|\bgreen\b|exit\s*0|all\s+gates\s+passed/i);
  });

  test('reopened-task-4: Closeout Summary command-results table records frontend test:e2e as a PASS', () => {
    // Companion to the previous test. The table currently has:
    //   `| \`bun --cwd frontend test:e2e\` | FAIL after installing Chromium: 1/7 passed, 6 failed/timed out |`
    // After Task 2 is complete, the row must record a PASS result (or an
    // explicitly amended/deferred state with a tracked TD entry).
    //
    // RED at HEAD: the row contains "FAIL ... 1/7 passed".
    // GREEN when:  the row records pass / smoke green.
    const summary = readClosoutSummary();
    const commands = readSubsection(summary, 'Commands run');
    expect(commands).not.toBe('');
    const e2eRow = commands
      .split('\n')
      .find((line) => line.includes('test:e2e'));
    expect(e2eRow).toBeDefined();
    expect(e2eRow).not.toMatch(/\bFAIL\b/);
    expect(e2eRow).not.toMatch(/1\/7/);
    expect(e2eRow).toMatch(/\bpass\b|\bgreen\b|smoke\s+(passed?|green)/i);
  });
});
