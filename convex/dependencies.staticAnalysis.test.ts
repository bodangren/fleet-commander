/**
 * Phase 6 verification — static-analysis guards on `convex/dependencies.ts`.
 *
 * Encodes the Phase 6 manual checklist item:
 *
 *   "Verify `getBlockedTasks` query uses index and `.take(N)` (no unbounded
 *    `.collect()`)"
 *
 * The integration test in `dependencies.integration.test.ts` asserts the
 * same contract at runtime through the mock context's stats collector.
 * This file is a complementary *static* guard: it reads the production
 * source and rejects the file if the unbounded patterns ever creep back in.
 * That gives the team a fast, no-CI-runtime signal that the architecture
 * guardrail in test-strategy §4 is intact.
 *
 * Why a static check in addition to the runtime test?
 *   - The runtime test depends on the mock's `collectCalls` /
 *     `takeCalls` accounting. If a future refactor wraps the query in a
 *     helper that the mock doesn't instrument, the runtime test goes
 *     blind. Source-grep is independent of any mock.
 *   - Test-strategy §4 reads as an architectural rule. Architectural
 *     rules deserve a regression test that survives the mocking layer.
 *
 * No production source code is modified in this commit.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_PATH = join(import.meta.dir, 'dependencies.ts');
let source: string;
try {
  source = readFileSync(SOURCE_PATH, 'utf8');
} catch (err) {
  throw new Error(
    `Phase 6 static-analysis guard: could not read ${SOURCE_PATH}: ${(err as Error).message}`,
  );
}

/**
 * Extract the body of a top-level `export const NAME = query({ ... })` block
 * by scanning braces from the `query({` opener. Robust to whitespace and
 * nested object literals.
 */
function extractQueryBlock(sourceText: string, name: string): string | null {
  const re = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*query\\s*\\(\\s*\\{`);
  const match = re.exec(sourceText);
  if (!match) return null;
  const openBraceIdx = sourceText.indexOf('{', match.index);
  let depth = 0;
  for (let i = openBraceIdx; i < sourceText.length; i++) {
    const ch = sourceText[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return sourceText.slice(openBraceIdx, i + 1);
    }
  }
  return null;
}

function extractMutationBlock(sourceText: string, name: string): string | null {
  const re = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*mutation\\s*\\(\\s*\\{`);
  const match = re.exec(sourceText);
  if (!match) return null;
  const openBraceIdx = sourceText.indexOf('{', match.index);
  let depth = 0;
  for (let i = openBraceIdx; i < sourceText.length; i++) {
    const ch = sourceText[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return sourceText.slice(openBraceIdx, i + 1);
    }
  }
  return null;
}

function stripComments(text: string): string {
  return text
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('Phase 6 verification — static analysis of convex/dependencies.ts query patterns', () => {
  it('exports the four handlers the verification scenarios depend on', () => {
    expect(extractQueryBlock(source, 'getBlockedTasks')).not.toBeNull();
    expect(extractQueryBlock(source, 'getCriticalPath')).not.toBeNull();
    expect(extractQueryBlock(source, 'getTaskWithDependencies')).not.toBeNull();
    expect(extractMutationBlock(source, 'addTaskDependency')).not.toBeNull();
    expect(extractMutationBlock(source, 'removeTaskDependency')).not.toBeNull();
    expect(extractMutationBlock(source, 'checkAndUnblockDownstream')).not.toBeNull();
  });

  it('getBlockedTasks uses by_status index with .take(N), no .collect() on the tasks table', () => {
    const block = extractQueryBlock(source, 'getBlockedTasks');
    expect(block, 'getBlockedTasks query block must be present').not.toBeNull();
    const cleaned = stripComments(block!);

    expect(cleaned).toMatch(/\.withIndex\(\s*['"]by_status['"]/);
    expect(cleaned).toMatch(/\.take\(\s*\d+\s*\)/);
    const collectHits = cleaned.match(/tasks[\s\S]{0,80}\.collect\(\s*\)/g) ?? [];
    expect(collectHits).toEqual([]);
  });

  it('getCriticalPath uses by_project index with .take(N), no .collect() on the tasks table', () => {
    const block = extractQueryBlock(source, 'getCriticalPath');
    expect(block, 'getCriticalPath query block must be present').not.toBeNull();
    const cleaned = stripComments(block!);

    expect(cleaned).toMatch(/\.withIndex\(\s*['"]by_project['"]/);
    expect(cleaned).toMatch(/\.take\(\s*\d+\s*\)/);
    const collectHits = cleaned.match(/tasks[\s\S]{0,80}\.collect\(\s*\)/g) ?? [];
    expect(collectHits).toEqual([]);
  });

  it('checkAndUnblockDownstream uses by_project index with .take(N), no .collect() on the tasks table', () => {
    const block = extractMutationBlock(source, 'checkAndUnblockDownstream');
    expect(block, 'checkAndUnblockDownstream mutation block must be present').not.toBeNull();
    const cleaned = stripComments(block!);

    expect(cleaned).toMatch(/\.withIndex\(\s*['"]by_project['"]/);
    expect(cleaned).toMatch(/\.take\(\s*\d+\s*\)/);
    const collectHits = cleaned.match(/tasks[\s\S]{0,80}\.collect\(\s*\)/g) ?? [];
    expect(collectHits).toEqual([]);
  });

  it('addTaskDependency uses .take(N) (not .collect()) when it scans project-wide tasks for cycle detection', () => {
    const block = extractMutationBlock(source, 'addTaskDependency');
    expect(block, 'addTaskDependency mutation block must be present').not.toBeNull();
    const cleaned = stripComments(block!);

    const projectTasksQuery = cleaned.match(
      /by_project[\s\S]{0,200}?(?:\.collect\(\s*\)|\.take\(\s*\d+\s*\))/,
    );
    expect(projectTasksQuery, 'addTaskDependency must query by_project').not.toBeNull();
    expect(projectTasksQuery![0]).toMatch(/\.take\(\s*\d+\s*\)/);
    expect(projectTasksQuery![0]).not.toMatch(/\.collect\(\s*\)/);
  });
});
