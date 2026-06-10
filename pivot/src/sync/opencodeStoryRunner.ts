import { createSession, sendPromptToSession } from '../orchestrator/sdkClient';
import { getOpencodeClient } from '../orchestrator/opencodeServer';
import type { StoryGenerationRunner } from '../routes/projects';

/**
 * Build a StoryGenerationRunner that uses the persistent OpenCode SDK client.
 * Reads provider/model from env (STORY_GEN_PROVIDER / STORY_GEN_MODEL) with
 * conservative defaults; throws when the harness is unavailable so the route
 * layer can map errors to a 502.
 * @returns A runner that takes a prompt string and resolves to LLM output text
 */
export function createOpencodeStoryRunner(): StoryGenerationRunner {
  return async (prompt: string): Promise<string> => {
    const client = getOpencodeClient();
    const providerId = process.env.STORY_GEN_PROVIDER ?? 'openai';
    const modelId = process.env.STORY_GEN_MODEL ?? 'gpt-4o-mini';
    const sessionId = await createSession(client, 'story-generator');
    const result = await sendPromptToSession({
      client,
      sessionId,
      promptText: prompt,
      providerId,
      modelId,
      timeoutMs: 60_000,
    });
    if (result.error) {
      throw new Error(`${result.error.type}: ${result.error.message}`);
    }
    return result.output;
  };
}
