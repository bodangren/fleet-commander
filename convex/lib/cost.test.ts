import { describe, expect, it } from 'bun:test';
import {
  computeCost,
  computeSessionSavings,
  estimateTokens,
  extractTokenUsage,
  normalizeModelName,
  MODEL_RATES,
  DEFAULT_RATE,
} from './cost';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('approximates 1 token per 4 characters', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('computeCost', () => {
  it('calculates cost for known model', () => {
    const rate = MODEL_RATES['gpt-4'];
    const cost = computeCost('gpt-4', 1_000_000, 0);
    expect(cost).toBeCloseTo(rate.inputPerMillion, 6);
  });

  it('calculates cost for output tokens', () => {
    const rate = MODEL_RATES['gpt-4'];
    const cost = computeCost('gpt-4', 0, 1_000_000);
    expect(cost).toBeCloseTo(rate.outputPerMillion, 6);
  });

  it('combines input and output costs', () => {
    const cost = computeCost('gpt-4o', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(20.0, 6);
  });

  it('falls back to default rate for unknown model', () => {
    const cost = computeCost('unknown-model', 1_000_000, 0);
    expect(cost).toBeCloseTo(DEFAULT_RATE.inputPerMillion, 6);
  });

  it('handles zero tokens', () => {
    expect(computeCost('gpt-4', 0, 0)).toBe(0);
  });

  it('returns reasonable cost for small token counts', () => {
    const cost = computeCost('gpt-4o-mini', 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });
});

describe('computeSessionSavings', () => {
  it('computes savings for context tokens', () => {
    const savings = computeSessionSavings(1_000_000, 'gpt-4');
    expect(savings).toBeCloseTo(MODEL_RATES['gpt-4'].inputPerMillion, 6);
  });

  it('returns 0 for zero context', () => {
    expect(computeSessionSavings(0, 'gpt-4')).toBe(0);
  });

  it('falls back to default rate for unknown model', () => {
    const savings = computeSessionSavings(1_000_000, 'unknown');
    expect(savings).toBeCloseTo(DEFAULT_RATE.inputPerMillion, 6);
  });
});

describe('normalizeModelName', () => {
  it('strips provider prefix', () => {
    expect(normalizeModelName('anthropic/claude-3-sonnet')).toBe('claude-3-sonnet');
    expect(normalizeModelName('openai/gpt-4o')).toBe('gpt-4o');
  });

  it('returns bare name unchanged', () => {
    expect(normalizeModelName('gpt-4')).toBe('gpt-4');
  });

  it('handles multiple slashes by taking last segment', () => {
    expect(normalizeModelName('a/b/gpt-4')).toBe('gpt-4');
  });
});

describe('extractTokenUsage', () => {
  it('extracts OpenAI-style fields', () => {
    const usage = extractTokenUsage({
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });
    expect(usage.inputTokens).toBe(100);
    expect(usage.outputTokens).toBe(50);
  });

  it('extracts Anthropic-style fields', () => {
    const usage = extractTokenUsage({
      usage: { input_tokens: 200, output_tokens: 80 },
    });
    expect(usage.inputTokens).toBe(200);
    expect(usage.outputTokens).toBe(80);
  });

  it('extracts camelCase fields', () => {
    const usage = extractTokenUsage({
      usage: { promptTokens: 300, completionTokens: 150 },
    });
    expect(usage.inputTokens).toBe(300);
    expect(usage.outputTokens).toBe(150);
  });

  it('returns zeros when usage is missing', () => {
    const usage = extractTokenUsage({});
    expect(usage.inputTokens).toBe(0);
    expect(usage.outputTokens).toBe(0);
  });

  it('returns zeros for empty metadata', () => {
    const usage = extractTokenUsage({ usage: {} });
    expect(usage.inputTokens).toBe(0);
    expect(usage.outputTokens).toBe(0);
  });
});
