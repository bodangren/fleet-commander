import { describe, it, expect } from 'bun:test';
import { createPiStoryRunner, resolveStoryModel, DEFAULT_STORY_MODEL } from './piStoryRunner';
import { loadModelMap, resolveHarnessRoot, toPiModelRef } from '../orchestrator/piHarness';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('createPiStoryRunner', () => {
  it('returns a callable runner', () => {
    expect(typeof createPiStoryRunner({})).toBe('function');
  });

  it('defaults to a harness-served model', () => {
    // The previous OpenCode runner defaulted to openai/gpt-4o-mini, which the
    // harness serves no role for; that would fail closed on every call.
    expect(DEFAULT_STORY_MODEL).not.toBe('openai/gpt-4o-mini');
    expect(DEFAULT_STORY_MODEL).toMatch(/^[^/]+\/[^/]+$/);
  });

  const harnessRoot = resolveHarnessRoot();
  const present = existsSync(resolve(harnessRoot, 'agents'));

  it.skipIf(!present)('default model is in the installed harness model map', () => {
    expect(toPiModelRef(DEFAULT_STORY_MODEL, loadModelMap(harnessRoot))).not.toBeNull();
  });

  it('surfaces generation failures as thrown errors for the 502 mapping', async () => {
    // An unserved STORY_GEN_MODEL fails closed inside runPiPrompt; the runner
    // contract is to throw so the route layer maps it to a 502.
    const run = createPiStoryRunner({ STORY_GEN_MODEL: 'nonexistent/model' });
    await expect(run('prompt')).rejects.toThrow(/not in the harness model map/);
  });

  it('reads STORY_GEN_MODEL, treating blank values as unset', () => {
    expect(resolveStoryModel({ STORY_GEN_MODEL: 'vocengine-coding/glm-5.2' })).toBe(
      'vocengine-coding/glm-5.2',
    );
    expect(resolveStoryModel({ STORY_GEN_MODEL: '  minimax-cn-coding-plan/MiniMax-M3  ' })).toBe(
      'minimax-cn-coding-plan/MiniMax-M3',
    );
    expect(resolveStoryModel({ STORY_GEN_MODEL: '   ' })).toBe(DEFAULT_STORY_MODEL);
    expect(resolveStoryModel({})).toBe(DEFAULT_STORY_MODEL);
  });
});
