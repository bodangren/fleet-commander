import { runPiPrompt } from '../orchestrator/piPrompt';
import type { StoryGenerationRunner } from '../routes/projects';

/**
 * Model used for story generation when STORY_GEN_MODEL is unset.
 * Must be a reference pi-measure-harness serves a `coder-*` role for, or
 * generation fails closed — see ADR-004.
 */
export const DEFAULT_STORY_MODEL = 'openai/gpt-5.6-luna';

/**
 * Resolves the story-generation model from the environment.
 * A blank or whitespace-only STORY_GEN_MODEL is treated as unset.
 *
 * @param env - Environment to read
 */
export function resolveStoryModel(env: NodeJS.ProcessEnv): string {
  return env.STORY_GEN_MODEL?.trim() || DEFAULT_STORY_MODEL;
}

/**
 * Builds a StoryGenerationRunner backed by pi-measure-harness.
 *
 * Reads the model from `STORY_GEN_MODEL` as a `provider/model` reference,
 * defaulting to a harness-served model. Throws on failure so the route layer
 * can map it to a 502, matching the previous OpenCode-backed runner.
 *
 * @param env - Environment to read, defaults to the process environment
 * @returns A runner taking a prompt and resolving to generated text
 */
export function createPiStoryRunner(
  env: NodeJS.ProcessEnv = process.env,
): StoryGenerationRunner {
  return async (prompt: string): Promise<string> => {
    const result = await runPiPrompt({
      modelRef: resolveStoryModel(env),
      prompt,
      timeoutMs: 60_000,
    });
    if (result.error) {
      throw new Error(result.error);
    }
    return result.output;
  };
}
