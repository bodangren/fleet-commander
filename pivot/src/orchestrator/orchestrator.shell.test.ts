/**
 * Phase 3: Thin the Shell — Red-phase guardrails.
 *
 * These tests assert the post-decomposition shape of `runProject` and
 * `orchestrator.ts` before the Phase 3 refactor lands:
 *
 *   1. `runProject` body length is below the 200-line shell target.
 *   2. `orchestrator.ts` file length is below the 500-line god-file threshold
 *      (gates the TD-206 allowlist removal in `measure/godfile-allowlist.txt`).
 *   3. `runProject` body has a bounded number of control-flow statements —
 *      a thin shell delegates branches to extracted stage modules rather
 *      than embedding them inline.
 *   4. `runProject` exported signature is stable (locks the public contract
 *      for callers — runAllProjects + test files).
 *   5. The TypeScript AST-derived external production importer/caller set for
 *      `runProject` is exactly the API entrypoint and one-shot CLI. Both
 *      modules must invoke the binding they import; the same-file
 *      `runAllProjects` call remains valid.
 *
 * Tests 1-3 are RED today: the body spans 87-834 (747 lines), the file is
 * 893 lines, and the body contains many inline branches. Tests 4-5 lock the
 * signature and production caller boundary will continue to pass before and
 * after the refactor.
 *
 * Source: measure/tracks/orchestrator_decomposition_20260605/plan.md (Phase 3)
 *         measure/tracks/orchestrator_decomposition_20260605/test-strategy.md
 *         (Per-Phase Test Notes §Phase 3 + Architecture Guardrails).
 */

import { describe, expect, it, beforeAll } from 'bun:test';
import * as fs from 'node:fs';
import { relative, resolve } from 'node:path';
import * as ts from 'typescript';

const ORCHESTRATOR_TS = resolve(import.meta.dir, 'orchestrator.ts');
const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..');
const PIVOT_SRC = resolve(REPO_ROOT, 'pivot', 'src');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const TEST_OR_FIXTURE_PATH =
  /(?:\.test|\.spec|\.convex-test|\.testHelper)\.[jt]sx?$|(?:^|\/)__(?:fixtures|tests)__(?:\/|$)/;
const EXPECTED_EXTERNAL_RUN_PROJECT_CALLERS = [
  'pivot/src/orchestrator/run.ts',
  'pivot/src/routes/projectRun.ts',
];
const AST_COMPILER_OPTIONS: ts.CompilerOptions = {
  allowJs: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ESNext,
};

interface FunctionBody {
  signatureLine: number;
  braceStart: number;
  braceEnd: number;
  bodyLines: number;
}

let source = '';
let runProjectBody: FunctionBody;
let fileLineCount = 0;

interface RunProjectUsage {
  relPath: string;
  importLines: number[];
  callLines: number[];
}

function toRepoRelative(absPath: string): string {
  return relative(REPO_ROOT, absPath).split('\\').join('/');
}

function isProductionSourceFile(absPath: string): boolean {
  const extension = absPath.slice(absPath.lastIndexOf('.'));
  return SOURCE_EXTENSIONS.has(extension) && !TEST_OR_FIXTURE_PATH.test(toRepoRelative(absPath));
}

function listProductionSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listProductionSourceFiles(absPath));
    } else if (entry.isFile() && isProductionSourceFile(absPath)) {
      files.push(absPath);
    }
  }
  return files;
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function resolvesToOrchestrator(sourcePath: string, moduleSpecifier: string): boolean {
  const resolution = ts.resolveModuleName(
    moduleSpecifier,
    sourcePath,
    AST_COMPILER_OPTIONS,
    ts.sys,
  ).resolvedModule;
  return resolution !== undefined && resolve(resolution.resolvedFileName) === ORCHESTRATOR_TS;
}

/**
 * Finds direct and namespace-import calls to runProject in one production file.
 * The scan parses TypeScript source rather than grepping text so comments,
 * strings, and lookalike local identifiers do not create false callers.
 */
function findRunProjectUsage(absPath: string): RunProjectUsage {
  const sourceFile = ts.createSourceFile(
    absPath,
    fs.readFileSync(absPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const directBindings = new Set<string>();
  const namespaceBindings = new Set<string>();
  const importLines: number[] = [];
  const callLines: number[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (!resolvesToOrchestrator(absPath, statement.moduleSpecifier.text)) {
      continue;
    }

    const bindings = statement.importClause?.namedBindings;
    if (!bindings) {
      continue;
    }
    if (ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (importedName === 'runProject') {
          directBindings.add(element.name.text);
          importLines.push(lineOf(sourceFile, element));
        }
      }
    } else if (ts.isNamespaceImport(bindings)) {
      namespaceBindings.add(bindings.name.text);
      importLines.push(lineOf(sourceFile, bindings));
    }
  }

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const isDirectBinding =
        ts.isIdentifier(expression) &&
        (expression.text === 'runProject' || directBindings.has(expression.text));
      const isNamespaceBinding =
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        namespaceBindings.has(expression.expression.text) &&
        expression.name.text === 'runProject';
      if (isDirectBinding || isNamespaceBinding) {
        callLines.push(lineOf(sourceFile, node));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return {
    relPath: toRepoRelative(absPath),
    importLines,
    callLines,
  };
}

function findFunction(sourceFile: ts.SourceFile, name: string): ts.FunctionDeclaration | undefined {
  return sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  );
}

function functionCallsRunProject(functionDeclaration: ts.FunctionDeclaration): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'runProject'
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  if (functionDeclaration.body) {
    visit(functionDeclaration.body);
  }
  return found;
}

/**
 * Locate the runProject async function and measure its body by tracking
 * brace depth from the opening `{` to the matching `}`. The body line count
 * is inclusive of the opening and closing braces.
 */
function measureFunctionBody(src: string, name: string): FunctionBody {
  const lines = src.split('\n');
  let signatureLine = -1;
  const sigRegex = new RegExp(`export\\s+async\\s+function\\s+${name}\\s*\\(`);
  for (let i = 0; i < lines.length; i += 1) {
    if (sigRegex.test(lines[i])) {
      signatureLine = i;
      break;
    }
  }
  if (signatureLine === -1) {
    throw new Error(`Could not find exported async function ${name} in source`);
  }

  let braceStart = -1;
  for (let i = signatureLine; i < Math.min(signatureLine + 30, lines.length); i += 1) {
    if (lines[i].includes('{')) {
      braceStart = i;
      break;
    }
  }
  if (braceStart === -1) {
    throw new Error(`Could not find opening brace for ${name}`);
  }

  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < lines.length; i += 1) {
    for (const ch of lines[i]) {
      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          braceEnd = i;
          break;
        }
      }
    }
    if (braceEnd !== -1) {
      break;
    }
  }
  if (braceEnd === -1) {
    throw new Error(`Could not find matching close brace for ${name}`);
  }

  return {
    signatureLine,
    braceStart,
    braceEnd,
    bodyLines: braceEnd - braceStart + 1,
  };
}

beforeAll(() => {
  source = fs.readFileSync(ORCHESTRATOR_TS, 'utf8');
  runProjectBody = measureFunctionBody(source, 'runProject');
  fileLineCount = source.split('\n').length;
});

describe('Phase 3: runProject shell thinning', () => {
  it('runProject function body is below the 200-line shell target', () => {
    // plan.md §Phase 3: "target < 200 lines, readable top-to-bottom"
    // test-strategy.md §Architecture Guardrails: "runProject target below 200 lines"
    expect(runProjectBody.bodyLines).toBeLessThan(200);
  });

  it('orchestrator.ts file is below the 500-line god-file threshold', () => {
    // doctor.sh:14 GODFILE_THRESHOLD=500; plan.md §Phase 4 removes the
    // orchestrator.ts entry from godfile-allowlist.txt only when the file
    // is under threshold. This test makes that gate explicit.
    expect(fileLineCount).toBeLessThan(500);
  });

  it('runProject body has a bounded number of control-flow statements', () => {
    // A thin orchestration shell delegates branches to stages/* modules.
    // The current body embeds retry, budget, circuit, coverage, and review
    // branches inline. We measure how many top-level control-flow keywords
    // appear between the braces; a readable shell should have a small count.
    const bodySource = source
      .split('\n')
      .slice(runProjectBody.braceStart + 1, runProjectBody.braceEnd)
      .join('\n');
    const patterns: RegExp[] = [
      /^\s*if\s*\(/gm,
      /^\s*else\s*\{/gm,
      /^\s*for\s*\(/gm,
      /^\s*while\s*\(/gm,
      /^\s*switch\s*\(/gm,
      /^\s*try\s*\{/gm,
      /^\s*catch\s*\(/gm,
    ];
    let total = 0;
    for (const p of patterns) {
      const matches = bodySource.match(p);
      if (matches) {
        total += matches.length;
      }
    }
    // A reasonable shell that delegates to stages should have < 15 inline
    // control-flow statements. The current body has many more.
    expect(total).toBeLessThan(15);
  });

  it('runProject exported signature is stable (locks the public caller contract)', () => {
    // Spec AC: "build-graph callers for runProject unchanged in count."
    // The 7-argument shape is the public contract that runAllProjects and
    // the test files import. Any change here forces an explicit review.
    const lines = source.split('\n');
    const sigStart = lines.findIndex((line) =>
      /export\s+async\s+function\s+runProject\s*\(/.test(line),
    );
    expect(sigStart).toBeGreaterThanOrEqual(0);

    // The signature spans multiple lines (params with type annotations) and
    // ends at the opening `{`. Capture the full header so we can assert
    // parameter names and the return type that callers depend on.
    let braceIdx = -1;
    for (let i = sigStart; i < Math.min(sigStart + 30, lines.length); i += 1) {
      if (lines[i].includes('{')) {
        braceIdx = i;
        break;
      }
    }
    expect(braceIdx).toBeGreaterThan(sigStart);
    // Include the braceIdx line — the return type annotation lives on the
    // same line as the function-body opening `{` (e.g. `): Promise<RunResult> {`).
    const header = lines.slice(sigStart, braceIdx + 1).join('\n');

    // Parameter names are part of the public contract.
    const expectedParams = [
      'client',
      'projectSlug',
      'config',
      'hooks',
      'executeFn',
      'gitHooks',
      'coverageHooks',
    ];
    for (const name of expectedParams) {
      expect(header).toContain(name);
    }

    // Return type must remain `Promise<RunResult>`.
    expect(header).toContain('Promise<RunResult>');
  });

  it('keeps the external production import/caller set exact without graph.db', () => {
    // The prior build-graph baseline incorrectly reported zero callers even
    // though the real API entrypoint and one-shot CLI import and call
    // runProject. Parse repository source directly so fresh and detached
    // checkouts enforce the same contract without an ignored graph database.
    const usages = listProductionSourceFiles(PIVOT_SRC)
      .filter((file) => resolve(file) !== ORCHESTRATOR_TS)
      .map(findRunProjectUsage)
      .filter((usage) => usage.importLines.length > 0 || usage.callLines.length > 0)
      .sort((left, right) => left.relPath.localeCompare(right.relPath));

    expect(usages.map((usage) => usage.relPath)).toEqual(EXPECTED_EXTERNAL_RUN_PROJECT_CALLERS);
    for (const usage of usages) {
      expect(usage.importLines).toHaveLength(1);
      expect(usage.callLines).toHaveLength(1);
    }
  });

  it('allows runAllProjects to call runProject inside orchestrator.ts itself', () => {
    const sourceFile = ts.createSourceFile(
      ORCHESTRATOR_TS,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const runAllProjects = findFunction(sourceFile, 'runAllProjects');

    expect(runAllProjects).toBeDefined();
    expect(functionCallsRunProject(runAllProjects!)).toBe(true);
  });
});
