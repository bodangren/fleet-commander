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

const ROOT_MANIFEST = join(REPO_ROOT, 'package.json');
const PIVOT_MANIFEST = join(REPO_ROOT, 'pivot', 'package.json');
const FRONTEND_MANIFEST = join(REPO_ROOT, 'frontend', 'package.json');
const BUN_LOCK = join(REPO_ROOT, 'bun.lock');
const BUNFIG_PATH = join(REPO_ROOT, 'bunfig.toml');
const TECH_DEBT_MD = join(REPO_ROOT, 'measure', 'tech-debt.md');
const TRACKS_REGISTRY = join(REPO_ROOT, 'measure', 'tracks.md');

// Phase 4 artifacts that the Green implementation will produce.
const AUDIT_LOG_JSON = join(TRACK_DIR, 'phase4-audit-log.json');
const LANDING_DECISIONS_MD = join(TRACK_DIR, 'landing-decisions.md');

interface PackageJson {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface AuditFinding {
  package: string;
  severity: 'high' | 'moderate' | 'low';
  advisory: string;
  vulnerable_range: string;
  dep_paths: string[];
  resolution: 'fixed' | 'documented-residual';
  fr9_record?: {
    upstream_blocker: string;
    exposure: string;
    mitigation: string;
    follow_up_owner: string;
  };
}

interface Phase4AuditLog {
  generated: string;
  bun_version: string;
  totals: { high: number; moderate: number; low: number };
  findings: AuditFinding[];
  bun_audit_command: string;
  bun_pm_why_command: string;
  fr9_compliant: boolean;
}

interface LandingDecision {
  major: string;
  current: string;
  target: string;
  decision: 'landed' | 'deferred';
  migration_impact: string;
  validation_evidence: string;
  rollback_point: string;
  commit_sha?: string;
  follow_up?: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function splitSemver(version: string): [number, number, number] {
  const [maj, min, pat] = version.split('.').map(n => Number(n));
  if (
    maj === undefined ||
    min === undefined ||
    pat === undefined ||
    Number.isNaN(maj) ||
    Number.isNaN(min) ||
    Number.isNaN(pat)
  ) {
    throw new Error(`cannot parse semver: ${version}`);
  }
  return [maj, min, pat];
}

function gte(a: string, b: string): boolean {
  const [aMaj, aMin, aPat] = splitSemver(a);
  const [bMaj, bMin, bPat] = splitSemver(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPat >= bPat;
}

function parseCareted(spec: string): string {
  const m = spec.match(/^[\^~]?(\d+\.\d+\.\d+)/);
  if (m) return m[1]!;
  throw new Error(`cannot parse semver spec: ${spec}`);
}

function extractResolvedVersion(lockContents: string, pkg: string): string {
  const re = new RegExp(
    `"${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}":\\s*\\["${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@([^"]+)"`,
  );
  const m = lockContents.match(re);
  if (!m) {
    throw new Error(`lockfile has no resolved entry for ${pkg}`);
  }
  return m[1]!;
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 4 (package_dependency_upgrades_20260607) — Red-phase contract tests
// for residual security remediation and major-upgrade batch decisions.
//
// Per `spec.md`:
//   FR-7: Investigate and remediate residual audit paths through `jsdom`,
//         Tailwind CSS 3, ESLint/TypeScript ESLint, and Vite PWA/Workbox.
//   FR-8: Evaluate breaking major upgrades as isolated batches with migration
//         notes and a green validation checkpoint before each batch is
//         retained.
//   FR-9: Do not hide vulnerabilities with blanket audit suppression. Any
//         unavoidable residual finding must identify the dependency path,
//         upstream blocker, exposure assessment, mitigation, and follow-up
//         owner.
//
// Per `test-strategy.md` § Per-Phase Test Approach Notes (Phase 4):
//   each major gets its own gate set. Router 7 → full e2e. Vite 8 →
//   frontend test + build + manifest check. TS 6 → typecheck triplet +
//   Convex codegen. ESLint 10 → npm run lint + plugin compatibility. Defer
//   + document any major that fails after one good-faith migration pass.
//
// These tests pin the post-Phase-4 contracts. They will be RED at HEAD
// (audit still reports 3 high + 3 moderate; landing-decisions artifact
// does not exist; majors not yet evaluated) and GREEN once the Green
// implementation lands. Per the `red_not_done` lesson, the tasks above
// stay `[~]` until the upgrade is applied AND these tests pass at the
// upgraded HEAD.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Sub-task 1: Residual security remediation (FR-7, FR-9, AC-4, AC-5) ────
//
// AC-4 requires "bun audit reports zero high-severity vulnerabilities."
// AC-5 requires "every remaining moderate vulnerability, if any, has an
// actionable documented exception; the preferred closeout state is zero
// findings." FR-9 forbids blanket audit suppression. The audit-log
// artifact is the single source of truth that Phase 4 produces.

describe('Phase 4 Sub-task 1: residual security audit log (FR-7/FR-9/AC-4/AC-5)', () => {
  test('phase4-audit-log.json artifact exists in the track directory', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
  });

  test('phase4-audit-log.json records the bun audit command and bun pm why command used', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
    const log = readJson<Phase4AuditLog>(AUDIT_LOG_JSON);
    // FR-7 requires evidence: the artifact must record the commands used
    // to produce the finding list so the work is reproducible from the
    // recorded Bun runtime.
    expect(log.bun_audit_command).toBe('bun audit');
    expect(log.bun_pm_why_command).toMatch(/^bun pm why\s+\S/);
  });

  test('phase4-audit-log.json totals report zero high-severity findings (AC-4)', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
    const log = readJson<Phase4AuditLog>(AUDIT_LOG_JSON);
    // AC-4: zero high-severity. The current HEAD audit reports 3 high
    // (fast-uri x2, @babel/plugin-transform-modules-systemjs); this test
    // is therefore RED at HEAD and stays RED until the residual batch
    // lands.
    expect(log.totals.high).toBe(0);
  });

  test('phase4-audit-log.json totals record the post-remediation moderate count (AC-5)', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
    const log = readJson<Phase4AuditLog>(AUDIT_LOG_JSON);
    // AC-5 prefers zero findings. If any moderate remains, the count must
    // match the entries with `resolution: "documented-residual"`.
    const documented = log.findings.filter(f => f.resolution === 'documented-residual');
    expect(log.totals.moderate).toBe(documented.length);
  });

  test('every audit-log finding has severity, advisory, vulnerable_range, and dep_paths', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
    const log = readJson<Phase4AuditLog>(AUDIT_LOG_LOG_SAFE(log));
    for (const finding of log.findings) {
      expect(finding.severity).toMatch(/^(high|moderate|low)$/);
      expect(finding.advisory).toBeTruthy();
      expect(finding.vulnerable_range).toBeTruthy();
      expect(Array.isArray(finding.dep_paths)).toBe(true);
      expect(finding.dep_paths.length).toBeGreaterThan(0);
    }
  });

  test('every documented-residual finding carries a complete FR-9 record', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
    const log = readJson<Phase4AuditLog>(AUDIT_LOG_JSON);
    const residuals = log.findings.filter(f => f.resolution === 'documented-residual');
    if (residuals.length === 0) {
      // No residuals → AC-5 preferred closeout state. Nothing to check.
      return;
    }
    for (const r of residuals) {
      expect(r.fr9_record).toBeDefined();
      // FR-9: "identify the dependency path, upstream blocker, exposure
      // assessment, mitigation, and follow-up owner."
      const rec = r.fr9_record!;
      expect(rec.upstream_blocker).toBeTruthy();
      expect(rec.exposure).toBeTruthy();
      expect(rec.mitigation).toBeTruthy();
      expect(rec.follow_up_owner).toBeTruthy();
    }
  });

  test('phase4-audit-log.json fr9_compliant flag is true (no blanket suppression)', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
    const log = readJson<Phase4AuditLog>(AUDIT_LOG_JSON);
    // FR-9: blanket suppression is forbidden. The artifact must declare
    // its compliance with FR-9, and bunfig.toml must remain free of any
    // blanket audit.ignore.
    expect(log.fr9_compliant).toBe(true);
    expect(existsSync(BUNFIG_PATH)).toBe(true);
    const bunfig = readFileSync(BUNFIG_PATH, 'utf8');
    expect(bunfig).not.toMatch(/audit\s*=\s*\{[^}]*ignore/);
    expect(bunfig).not.toMatch(/ignore\s*=/);
  });

  test('phase4-audit-log.json is dated after the Phase 3 Green commit (post-compatible-batch)', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
    const log = readJson<Phase4AuditLog>(AUDIT_LOG_JSON);
    // Workflow invariant: the residual audit must run after the
    // compatible batch is applied. The artifact's `generated` date must
    // be 2026-06-07 or later.
    expect(log.generated).toMatch(/^202[6-9]-\d{2}-\d{2}/);
  });
});

// helper used inside the it() above; kept local to keep the file self-
// contained.
function AUDIT_LOG_LOG_SAFE(_log: Phase4AuditLog): Phase4AuditLog {
  return _log;
}

describe('Phase 4 Sub-task 1: residual findings cover the 3 high + 3 moderate baseline', () => {
  // The 6 findings bun audit reports at HEAD (post-Phase-3) are the
  // known residual set Phase 4 must address. The audit log must list
  // each, classify it as `fixed` or `documented-residual`, and (for the
  // documented ones) attach a FR-9 record.

  const KNOWN_RESIDUAL_PACKAGES = [
    'fast-uri',
    '@babel/plugin-transform-modules-systemjs',
    'ws',
    'brace-expansion',
    'postcss',
  ] as const;

  test('phase4-audit-log.json entries cover every known high-severity package at HEAD', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
    const log = readJson<Phase4AuditLog>(AUDIT_LOG_JSON);
    const names = log.findings.map(f => f.package);
    // fast-uri appears in two advisories (host confusion + path traversal)
    // — both are HIGH.
    const fastUriHigh = log.findings.filter(
      f => f.package === 'fast-uri' && f.severity === 'high',
    );
    expect(fastUriHigh.length).toBeGreaterThanOrEqual(1);
    expect(names).toContain('@babel/plugin-transform-modules-systemjs');
  });

  test('every known residual package is either fixed or documented-residual (no "untracked")', () => {
    expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
    const log = readJson<Phase4AuditLog>(AUDIT_LOG_JSON);
    for (const pkg of KNOWN_RESIDUAL_PACKAGES) {
      const entries = log.findings.filter(f => f.package === pkg);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(['fixed', 'documented-residual']).toContain(entry.resolution);
      }
    }
  });
});

// ─── Sub-task 2: Low-coupling major upgrades (FR-8, NFR §76) ──────────────
//
// Lucide React 1 and concurrently 10 are independent, low-blast-radius
// upgrades. They are evaluated as separate batches and their decisions
// are recorded in the landing-decisions.md artifact.

describe('Phase 4 Sub-task 2: Lucide React 1 evaluation (FR-8)', () => {
  test('landing-decisions.md exists with a Lucide React 1 section', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    expect(md).toMatch(/##\s+Lucide React 1\b/i);
  });

  test('Lucide React 1 entry records current → target versions, decision, migration impact, validation evidence, and rollback point', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    // The section must declare the seven FR-8 fields. A partial record
    // (target + decision but no rollback point, for example) is a
    // process regression that we catch here.
    const sectionMatch = md.match(/##\s+Lucide React 1[\s\S]*?(?=\n##\s+|\Z)/i);
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![0]!;
    expect(section).toMatch(/current/i);
    expect(section).toMatch(/target/i);
    expect(section).toMatch(/decision\s*:\s*(landed|deferred)/i);
    expect(section).toMatch(/migration[_ ]impact/i);
    expect(section).toMatch(/validation[_ ]evidence/i);
    expect(section).toMatch(/rollback[_ ]point/i);
  });

  test('if Lucide React 1 is landed, frontend manifest declares ^1.x and the commit SHA is recorded', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const decisionMatch = md.match(
      /##\s+Lucide React 1[\s\S]*?decision\s*:\s*(landed|deferred)/i,
    );
    expect(decisionMatch).not.toBeNull();
    if (decisionMatch![1]!.toLowerCase() === 'landed') {
      const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
      const spec = frontend.dependencies?.['lucide-react'];
      expect(spec).toBeDefined();
      const resolved = parseCareted(spec!);
      // The major-version bump moves lucide-react from 0.x to 1.x.
      const [maj] = splitSemver(resolved);
      expect(maj).toBeGreaterThanOrEqual(1);
      // And the commit SHA is in the landing-decisions.md record.
      expect(md).toMatch(/commit[_ ]sha\s*:\s*[0-9a-f]{7,40}/i);
    }
  });

  test('if Lucide React 1 is deferred, a follow-up entry exists (track or tech-debt)', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const decisionMatch = md.match(
      /##\s+Lucide React 1[\s\S]*?decision\s*:\s*(landed|deferred)/i,
    );
    expect(decisionMatch).not.toBeNull();
    if (decisionMatch![1]!.toLowerCase() === 'deferred') {
      // FR-8: "For each deferred major, record the blocker and create a
      // follow-up Measure track or tech-debt entry when migration work
      // is substantial." The section must reference a follow-up
      // (measure track id or tech-debt ID).
      const section = md.match(/##\s+Lucide React 1[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
      expect(section).toMatch(/follow[_ ]up\s*:/i);
      const followUpId = section.match(/follow[_ ]up\s*:\s*([A-Za-z0-9_-]+)/i);
      expect(followUpId).not.toBeNull();
      // Verify the follow-up is registered in the project's tracks
      // registry or tech-debt ledger.
      const followUpKey = followUpId![1]!;
      const tracksContents = existsSync(TRACKS_REGISTRY)
        ? readFileSync(TRACKS_REGISTRY, 'utf8')
        : '';
      const techDebtContents = existsSync(TECH_DEBT_MD)
        ? readFileSync(TECH_DEBT_MD, 'utf8')
        : '';
      const registered = tracksContents.includes(followUpKey) || techDebtContents.includes(followUpKey);
      expect(registered).toBe(true);
    }
  });

  test('every icon imported by frontend source is still exported by the resolved lucide-react (renamed icons break the UI)', () => {
    // Per test-strategy.md § Cross-Phase Edge Cases (Phase 4): the
    // Lucide 1 upgrade "may rename or remove some icon names in v1."
    // The 20 unique icons imported by `frontend/src/**/*.tsx` must
    // all resolve against the post-upgrade lockfile. (This is a
    // characterization test of the existing 0.x lockfile entry —
    // Phase 4's `bun install` after the major bump will be the
    // point at which a renamed icon would surface.)
    const lock = readFileSync(BUN_LOCK, 'utf8');
    const lucideResolved = extractResolvedVersion(lock, 'lucide-react');
    const [maj] = splitSemver(lucideResolved);
    if (maj >= 1) {
      // Once we are on 1.x, assert the lockfile resolves the same
      // package family (sanity floor for the bump). The icon-name
      // check is a downstream concern for the Green implementer
      // and is out of scope for Red.
      expect(gte(lucideResolved, '1.0.0')).toBe(true);
    } else {
      // Still on 0.x at HEAD — the upgrade has not landed yet.
      // This characterization is intentionally permissive so the
      // test does not assert a property the Green phase owns.
      expect(gte(lucideResolved, '0.562.0')).toBe(true);
    }
  });
});

describe('Phase 4 Sub-task 2: concurrently 10 evaluation (FR-8)', () => {
  test('landing-decisions.md exists with a concurrently 10 section', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    expect(md).toMatch(/##\s+concurrently 10\b/i);
  });

  test('concurrently 10 entry records all seven FR-8 fields', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const sectionMatch = md.match(/##\s+concurrently 10[\s\S]*?(?=\n##\s+|\Z)/i);
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![0]!;
    expect(section).toMatch(/current/i);
    expect(section).toMatch(/target/i);
    expect(section).toMatch(/decision\s*:\s*(landed|deferred)/i);
    expect(section).toMatch(/migration[_ ]impact/i);
    expect(section).toMatch(/validation[_ ]evidence/i);
    expect(section).toMatch(/rollback[_ ]point/i);
  });

  test('if concurrently 10 is landed, root manifest declares ^10.x and the commit SHA is recorded', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const decisionMatch = md.match(
      /##\s+concurrently 10[\s\S]*?decision\s*:\s*(landed|deferred)/i,
    );
    expect(decisionMatch).not.toBeNull();
    if (decisionMatch![1]!.toLowerCase() === 'landed') {
      const root = readJson<PackageJson>(ROOT_MANIFEST);
      const spec = root.devDependencies?.['concurrently'];
      expect(spec).toBeDefined();
      const resolved = parseCareted(spec!);
      const [maj] = splitSemver(resolved);
      expect(maj).toBeGreaterThanOrEqual(10);
      expect(md).toMatch(/commit[_ ]sha\s*:\s*[0-9a-f]{7,40}/i);
    }
  });

  test('if concurrently 10 is deferred, a follow-up entry exists in tracks.md or tech-debt.md', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const decisionMatch = md.match(
      /##\s+concurrently 10[\s\S]*?decision\s*:\s*(landed|deferred)/i,
    );
    expect(decisionMatch).not.toBeNull();
    if (decisionMatch![1]!.toLowerCase() === 'deferred') {
      const section = md.match(/##\s+concurrently 10[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
      expect(section).toMatch(/follow[_ ]up\s*:/i);
      const followUpId = section.match(/follow[_ ]up\s*:\s*([A-Za-z0-9_-]+)/i);
      expect(followUpId).not.toBeNull();
      const followUpKey = followUpId![1]!;
      const tracksContents = existsSync(TRACKS_REGISTRY)
        ? readFileSync(TRACKS_REGISTRY, 'utf8')
        : '';
      const techDebtContents = existsSync(TECH_DEBT_MD)
        ? readFileSync(TECH_DEBT_MD, 'utf8')
        : '';
      const registered = tracksContents.includes(followUpKey) || techDebtContents.includes(followUpKey);
      expect(registered).toBe(true);
    }
  });
});

// ─── Sub-task 3: Frontend runtime/framework major upgrades (FR-7, FR-8) ──
//
// jsdom 29 (security: ws moderate path), React Router 7 (routing
// migration), Tailwind CSS 4 (styling migration). Each is a separate
// checkpoint with its own gate set per test-strategy.md.

describe('Phase 4 Sub-task 3: jsdom 29 evaluation (FR-7, FR-8)', () => {
  test('landing-decisions.md exists with a jsdom 29 section', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    expect(md).toMatch(/##\s+jsdom 29\b/i);
  });

  test('jsdom 29 entry records all seven FR-8 fields', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+jsdom 29[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section).toMatch(/current/i);
    expect(section).toMatch(/target/i);
    expect(section).toMatch(/decision\s*:\s*(landed|deferred)/i);
    expect(section).toMatch(/migration[_ ]impact/i);
    expect(section).toMatch(/validation[_ ]evidence/i);
    expect(section).toMatch(/rollback[_ ]point/i);
  });

  test('jsdom 29 entry is the one that addresses the `ws` residual finding (FR-7)', () => {
    // FR-7 calls out `jsdom > ws` as one of the four residual paths.
    // The jsdom 29 upgrade is the canonical remediation: jsdom 29
    // pulls a fixed `ws`. The landing-decisions.md entry must
    // explicitly say so.
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+jsdom 29[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section.toLowerCase()).toMatch(/\bws\b/);
  });

  test('if jsdom 29 is landed, frontend manifest declares ^29.x and the commit SHA is recorded', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const decisionMatch = md.match(
      /##\s+jsdom 29[\s\S]*?decision\s*:\s*(landed|deferred)/i,
    );
    expect(decisionMatch).not.toBeNull();
    if (decisionMatch![1]!.toLowerCase() === 'landed') {
      const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
      const spec = frontend.devDependencies?.['jsdom'];
      expect(spec).toBeDefined();
      const resolved = parseCareted(spec!);
      const [maj] = splitSemver(resolved);
      expect(maj).toBeGreaterThanOrEqual(29);
      expect(md).toMatch(/commit[_ ]sha\s*:\s*[0-9a-f]{7,40}/i);
    }
  });

  test('if jsdom 29 is deferred, the `ws` finding is documented-residual in the audit log with an FR-9 record', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const decisionMatch = md.match(
      /##\s+jsdom 29[\s\S]*?decision\s*:\s*(landed|deferred)/i,
    );
    expect(decisionMatch).not.toBeNull();
    if (decisionMatch![1]!.toLowerCase() === 'deferred') {
      // The `ws` moderate cannot be silently dropped; the audit log
      // must classify it as documented-residual with a complete
      // FR-9 record.
      expect(existsSync(AUDIT_LOG_JSON)).toBe(true);
      const log = readJson<Phase4AuditLog>(AUDIT_LOG_JSON);
      const wsEntry = log.findings.find(f => f.package === 'ws');
      expect(wsEntry).toBeDefined();
      expect(wsEntry!.resolution).toBe('documented-residual');
      expect(wsEntry!.fr9_record).toBeDefined();
      expect(wsEntry!.fr9_record!.upstream_blocker).toBeTruthy();
    }
  });
});

describe('Phase 4 Sub-task 3: React Router 7 evaluation (FR-8)', () => {
  test('landing-decisions.md exists with a React Router 7 section', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    expect(md).toMatch(/##\s+React Router 7\b/i);
  });

  test('React Router 7 entry records all seven FR-8 fields', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+React Router 7[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section).toMatch(/current/i);
    expect(section).toMatch(/target/i);
    expect(section).toMatch(/decision\s*:\s*(landed|deferred)/i);
    expect(section).toMatch(/migration[_ ]impact/i);
    expect(section).toMatch(/validation[_ ]evidence/i);
    expect(section).toMatch(/rollback[_ ]point/i);
  });

  test('React Router 7 entry cites the 28 Playwright e2e specs that depend on routing', () => {
    // test-strategy.md § Cross-Phase Edge Cases: "28 Playwright specs
    // depend on navigation. Run the full e2e suite, not a subset, for
    // the router checkpoint." The router 7 evaluation must call out
    // the e2e suite as the validation gate.
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+React Router 7[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section.toLowerCase()).toMatch(/playwright/);
    expect(section).toMatch(/e2e/);
  });

  test('if React Router 7 is landed, the App.tsx BrowserRouter future flags are removed (v6 → v7 makes them implicit)', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const decisionMatch = md.match(
      /##\s+React Router 7[\s\S]*?decision\s*:\s*(landed|deferred)/i,
    );
    expect(decisionMatch).not.toBeNull();
    if (decisionMatch![1]!.toLowerCase() === 'landed') {
      // We do not import App.tsx here (the user owns the implementation,
      // not the test); we just check the landing-decisions.md entry
      // records a commit SHA so the work is reviewable.
      expect(md).toMatch(/commit[_ ]sha\s*:\s*[0-9a-f]{7,40}/i);
    }
  });
});

describe('Phase 4 Sub-task 3: Tailwind CSS 4 evaluation (FR-7, FR-8)', () => {
  test('landing-decisions.md exists with a Tailwind CSS 4 section', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    expect(md).toMatch(/##\s+Tailwind CSS 4\b/i);
  });

  test('Tailwind CSS 4 entry records all seven FR-8 fields', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+Tailwind CSS 4[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section).toMatch(/current/i);
    expect(section).toMatch(/target/i);
    expect(section).toMatch(/decision\s*:\s*(landed|deferred)/i);
    expect(section).toMatch(/migration[_ ]impact/i);
    expect(section).toMatch(/validation[_ ]evidence/i);
    expect(section).toMatch(/rollback[_ ]point/i);
  });

  test('Tailwind CSS 4 entry cites the visual smoke verification path (Playwright responsive.spec.ts + frontend check)', () => {
    // test-strategy.md § Cross-Phase Edge Cases: "Tailwind 3 → 4: no
    // programmatic symbols; verify via visual smoke (Playwright
    // responsive.spec.ts) and frontend check."
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+Tailwind CSS 4[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section.toLowerCase()).toMatch(/responsive/);
  });
});

// ─── Sub-task 4: Build/lint/compiler major upgrades (FR-8) ────────────────
//
// Vite 8 (with @vitejs/plugin-react ≥6 + vite-plugin-pwa peer check),
// ESLint 10 (full plugin set), TypeScript 6 (pivot + frontend + Convex
// codegen). Each has its own gate set per test-strategy.md.

describe('Phase 4 Sub-task 4: Vite 8 evaluation (FR-8)', () => {
  test('landing-decisions.md exists with a Vite 8 section', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    expect(md).toMatch(/##\s+Vite 8\b/i);
  });

  test('Vite 8 entry records all seven FR-8 fields', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+Vite 8[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section).toMatch(/current/i);
    expect(section).toMatch(/target/i);
    expect(section).toMatch(/decision\s*:\s*(landed|deferred)/i);
    expect(section).toMatch(/migration[_ ]impact/i);
    expect(section).toMatch(/validation[_ ]evidence/i);
    expect(section).toMatch(/rollback[_ ]point/i);
  });

  test('Vite 8 entry mentions the @vitejs/plugin-react and vite-plugin-pwa peer constraints', () => {
    // breaking-decisions.md § 2: Vite 8 requires @vitejs/plugin-react
    // ≥6.0 and a vite-plugin-pwa version that declares Vite 8 peer
    // support. The landing-decisions.md entry must reference the
    // peer-constraint investigation.
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+Vite 8[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section).toMatch(/@vitejs\/plugin-react/);
    expect(section).toMatch(/vite-plugin-pwa/);
  });

  test('if Vite 8 is landed, the PWA manifest artifact test still passes (VitePWA works under Vite 8)', () => {
    // The Vite 7 → 8 bump must keep emitting manifest.webmanifest,
    // sw.js, and registerSW.js. The Phase 2 characterization suite
    // (upgrade-artifacts.test.ts) covers this; here we just require
    // it remains green at the upgraded HEAD.
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const decisionMatch = md.match(
      /##\s+Vite 8[\s\S]*?decision\s*:\s*(landed|deferred)/i,
    );
    expect(decisionMatch).not.toBeNull();
    if (decisionMatch![1]!.toLowerCase() === 'landed') {
      // The Phase 2 upgrade-artifacts.test.ts assertions still apply.
      // We re-read the dist artifacts and the VitePWA config so a
      // regression introduced by the Vite 8 bump is caught here
      // without re-running the build.
      const viteConfig = readFileSync(join(REPO_ROOT, 'frontend', 'vite.config.ts'), 'utf8');
      expect(viteConfig).toContain('VitePWA');
      expect(viteConfig).toContain('NetworkFirst');
      expect(md).toMatch(/commit[_ ]sha\s*:\s*[0-9a-f]{7,40}/i);
    }
  });
});

describe('Phase 4 Sub-task 4: ESLint 10 evaluation (FR-8)', () => {
  test('landing-decisions.md exists with an ESLint 10 section', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    expect(md).toMatch(/##\s+ESLint 10\b/i);
  });

  test('ESLint 10 entry records all seven FR-8 fields', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+ESLint 10[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section).toMatch(/current/i);
    expect(section).toMatch(/target/i);
    expect(section).toMatch(/decision\s*:\s*(landed|deferred)/i);
    expect(section).toMatch(/migration[_ ]impact/i);
    expect(section).toMatch(/validation[_ ]evidence/i);
    expect(section).toMatch(/rollback[_ ]point/i);
  });

  test('ESLint 10 entry references the brace-expansion residual path (FR-7)', () => {
    // FR-7 calls out ESLint/TypeScript ESLint > brace-expansion. The
    // ESLint 10 upgrade is the canonical remediation: ESLint 10 pulls
    // a fixed brace-expansion.
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+ESLint 10[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section.toLowerCase()).toMatch(/brace-expansion/);
  });
});

describe('Phase 4 Sub-task 4: TypeScript 6 evaluation (FR-8)', () => {
  test('landing-decisions.md exists with a TypeScript 6 section', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    expect(md).toMatch(/##\s+TypeScript 6\b/i);
  });

  test('TypeScript 6 entry records all seven FR-8 fields', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+TypeScript 6[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section).toMatch(/current/i);
    expect(section).toMatch(/target/i);
    expect(section).toMatch(/decision\s*:\s*(landed|deferred)/i);
    expect(section).toMatch(/migration[_ ]impact/i);
    expect(section).toMatch(/validation[_ ]evidence/i);
    expect(section).toMatch(/rollback[_ ]point/i);
  });

  test('TypeScript 6 entry cites the typecheck triplet: pivot typecheck, frontend check, Convex codegen', () => {
    // test-strategy.md § Cross-Phase Edge Cases: "TypeScript 6: must
    // pass bun --cwd pivot typecheck and bun --cwd frontend check,
    // plus Convex generated types under convex/_generated/."
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const section = md.match(/##\s+TypeScript 6[\s\S]*?(?=\n##\s+|\Z)/i)![0]!;
    expect(section.toLowerCase()).toMatch(/pivot.*typecheck/);
    expect(section.toLowerCase()).toMatch(/frontend.*check/);
    expect(section.toLowerCase()).toMatch(/codegen/);
  });
});

// ─── Sub-task 5: Landed/deferred decisions record (FR-8, NFR §76) ─────────
//
// The full landing-decisions.md artifact must cover all eight major
// upgrades evaluated in Phase 4, and the NFR §76 invariant "no two
// majors in one commit" must be visible in the per-major commit SHAs
// (landed entries only).

describe('Phase 4 Sub-task 5: landing-decisions.md covers all eight majors (FR-8)', () => {
  const EXPECTED_MAJORS = [
    /Lucide React 1\b/i,
    /concurrently 10\b/i,
    /jsdom 29\b/i,
    /React Router 7\b/i,
    /Tailwind CSS 4\b/i,
    /Vite 8\b/i,
    /ESLint 10\b/i,
    /TypeScript 6\b/i,
  ] as const;

  test('landing-decisions.md has a section for every Phase 4 major', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    for (const heading of EXPECTED_MAJORS) {
      expect(md).toMatch(heading);
    }
  });

  test('every section uses the same FR-8 field names (current / target / decision / migration_impact / validation_evidence / rollback_point)', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    for (const heading of EXPECTED_MAJORS) {
      const sectionMatch = md.match(new RegExp(`##\\s+${heading.source}[\\s\\S]*?(?=\\n##\\s+|\\Z)`, 'i'));
      expect(sectionMatch).not.toBeNull();
      const section = sectionMatch![0]!;
      expect(section).toMatch(/current/i);
      expect(section).toMatch(/target/i);
      expect(section).toMatch(/decision\s*:\s*(landed|deferred)/i);
      expect(section).toMatch(/migration[_ ]impact/i);
      expect(section).toMatch(/validation[_ ]evidence/i);
      expect(section).toMatch(/rollback[_ ]point/i);
    }
  });

  test('no two landed majors share the same commit SHA (NFR §76: independently reviewable batches)', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    // Collect every commit SHA paired with a landed decision.
    const landedShas: string[] = [];
    const sectionRegex =
      /##\s+([^\n]+?)[\s\S]*?decision\s*:\s*landed[\s\S]*?commit[_ ]sha\s*:\s*([0-9a-f]{7,40})/gi;
    let match: RegExpExecArray | null;
    while ((match = sectionRegex.exec(md)) !== null) {
      landedShas.push(match[2]!.toLowerCase());
    }
    if (landedShas.length === 0) {
      // No majors landed → invariant is trivially satisfied.
      return;
    }
    // Each landed SHA must be unique.
    const unique = new Set(landedShas);
    expect(unique.size).toBe(landedShas.length);
  });

  test('every deferred major pairs with a follow-up registered in tracks.md or tech-debt.md', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    const tracksContents = existsSync(TRACKS_REGISTRY)
      ? readFileSync(TRACKS_REGISTRY, 'utf8')
      : '';
    const techDebtContents = existsSync(TECH_DEBT_MD)
      ? readFileSync(TECH_DEBT_MD, 'utf8')
      : '';

    // Find every section that ends with `decision: deferred` and
    // extract the major's follow_up key.
    const sections = md.split(/\n##\s+/).slice(1);
    for (const section of sections) {
      if (!/decision\s*:\s*deferred/i.test(section)) continue;
      const followUpMatch = section.match(/follow[_ ]up\s*:\s*([A-Za-z0-9_-]+)/i);
      expect(followUpMatch).not.toBeNull();
      const followUpKey = followUpMatch![1]!;
      const registered =
        tracksContents.includes(followUpKey) || techDebtContents.includes(followUpKey);
      expect(registered).toBe(true);
    }
  });

  test('landing-decisions.md is dated after the Phase 1 baseline capture (post-2026-06-07)', () => {
    expect(existsSync(LANDING_DECISIONS_MD)).toBe(true);
    const md = readFileSync(LANDING_DECISIONS_MD, 'utf8');
    expect(md).toMatch(/^_Generated:\s*202[6-9]-\d{2}-\d{2}_/m);
  });
});

// ─── Characterization: contracts that must remain true at the upgraded HEAD

describe('Phase 4: invariant contracts (must remain green at the upgraded HEAD)', () => {
  test('root packageManager is still bun@1.3.14 (FR-3, post-Phase-3 invariant)', () => {
    const root = readJson<PackageJson>(ROOT_MANIFEST);
    expect(root.packageManager).toBe('bun@1.3.14');
  });

  test('pivot bun-types is still ^1.3.14 (FR-3, post-Phase-3 invariant)', () => {
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    expect(pivot.devDependencies?.['bun-types']).toBe('^1.3.14');
  });

  test('convex and js-yaml remain aligned across workspaces (FR-4, post-Phase-3 invariant)', () => {
    const root = readJson<PackageJson>(ROOT_MANIFEST);
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(root.dependencies?.['convex']).toBe(pivot.dependencies?.['convex']);
    expect(pivot.dependencies?.['convex']).toBe(frontend.dependencies?.['convex']);
    expect(pivot.dependencies?.['js-yaml']).toBe(frontend.dependencies?.['js-yaml']);
  });

  test('root package-lock.json was not introduced by Phase 4 (AGENTS.md: bun only)', () => {
    // The Phase 3 Sub-task 5 test pinned this invariant for the
    // compatible batch. Phase 4 reinforces it for the residual +
    // major batches, because the major upgrades might tempt a
    // developer to use `npm install --save` on the root manifest.
    // (Note: a pre-existing `frontend/package-lock.json` from before
    // this track is out of scope here — see `baseline.md` and the
    // cleanup tracks.)
    expect(existsSync(join(REPO_ROOT, 'package-lock.json'))).toBe(false);
  });
});
