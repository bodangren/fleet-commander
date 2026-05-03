/**
 * Cost calculation utilities for LLM token usage tracking.
 * All costs in USD.
 */

export interface ModelRate {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const MODEL_RATES: Record<string, ModelRate> = {
  'gpt-4': { inputPerMillion: 30.0, outputPerMillion: 60.0 },
  'gpt-4-turbo': { inputPerMillion: 10.0, outputPerMillion: 30.0 },
  'gpt-4o': { inputPerMillion: 5.0, outputPerMillion: 15.0 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-3.5-turbo': { inputPerMillion: 0.5, outputPerMillion: 1.5 },
  'claude-3-opus': { inputPerMillion: 15.0, outputPerMillion: 75.0 },
  'claude-3-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-3-haiku': { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  'claude-3.5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'gemini-1.5-pro': { inputPerMillion: 3.5, outputPerMillion: 10.5 },
  'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.3 },
};

export const DEFAULT_RATE: ModelRate = { inputPerMillion: 10.0, outputPerMillion: 30.0 };

/**
 * Estimate tokens from text length (rough: 1 token ≈ 4 chars).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Compute cost in USD for a given model and token counts.
 */
export function computeCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = MODEL_RATES[model] ?? DEFAULT_RATE;
  return (inputTokens * rate.inputPerMillion + outputTokens * rate.outputPerMillion) / 1_000_000;
}

/**
 * Compute session savings: cost avoided by resuming a session instead of
 * re-sending the full context as a fresh request.
 *
 * @param contextTokens - Estimated token count of the conversation context
 * @param model - Model identifier for rate lookup
 * @returns Cost in USD that would have been spent on a fresh start
 */
export function computeSessionSavings(
  contextTokens: number,
  model: string,
): number {
  const rate = MODEL_RATES[model] ?? DEFAULT_RATE;
  return (contextTokens * rate.inputPerMillion) / 1_000_000;
}

/**
 * Resolve model name from a harness response, handling provider prefixes.
 * e.g., "anthropic/claude-3-sonnet" → "claude-3-sonnet"
 */
export function normalizeModelName(raw: string): string {
  const slashIdx = raw.lastIndexOf('/');
  return slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw;
}

/**
 * Extract token counts from a harness execution response metadata object.
 * Supports OpenAI, Anthropic, and generic `usage` fields.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export function extractTokenUsage(metadata: Record<string, unknown>): TokenUsage {
  const usage = metadata.usage as Record<string, unknown> | undefined;
  if (!usage) {
    return { inputTokens: 0, outputTokens: 0 };
  }

  return {
    inputTokens:
      (usage.prompt_tokens as number) ??
      (usage.input_tokens as number) ??
      (usage.promptTokens as number) ??
      0,
    outputTokens:
      (usage.completion_tokens as number) ??
      (usage.output_tokens as number) ??
      (usage.completionTokens as number) ??
      0,
  };
}
