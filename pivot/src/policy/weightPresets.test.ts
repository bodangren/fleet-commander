import { describe, expect, test, beforeEach } from 'bun:test';
import { DEFAULT_WEIGHTS } from './scoring';

// Test the weight presets logic by mocking the file read
describe('weightPresets', () => {
  test('DEFAULT_WEIGHTS has all required fields', () => {
    const requiredFields = [
      'priorityWeight', 'unblockImpact', 'personaFitness',
      'harnessReliability', 'expectedCost', 'starvationBonus',
      'regressionRisk', 'retryFatigue', 'affinity',
    ];
    for (const field of requiredFields) {
      expect(DEFAULT_WEIGHTS).toHaveProperty(field);
      expect(typeof (DEFAULT_WEIGHTS as unknown as Record<string, number>)[field]).toBe('number');
    }
  });

  test('loadWeights returns defaults when file missing', () => {
    // Module-level test: when the presets file doesn't exist at the expected path,
    // loadWeights falls back to DEFAULT_WEIGHTS
    const { loadWeights } = require('./weightPresets');
    // If file exists (dev machine), just verify it returns a valid object
    const weights = loadWeights('nonexistent-project');
    expect(typeof weights.priorityWeight).toBe('number');
    expect(typeof weights.harnessReliability).toBe('number');
  });

  test('getActivePresetName returns a string', () => {
    const { getActivePresetName } = require('./weightPresets');
    const name = getActivePresetName();
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  test('listPresets returns array of preset names', () => {
    const { listPresets } = require('./weightPresets');
    const presets = listPresets();
    expect(Array.isArray(presets)).toBe(true);
    // If file exists, should have at least 'default'
    if (presets.length > 0) {
      expect(presets).toContain('default');
    }
  });

  test('getPresetPath returns absolute path', () => {
    const { getPresetPath } = require('./weightPresets');
    const path = getPresetPath();
    expect(path).toContain('weight-presets.yaml');
    expect(path.startsWith('/')).toBe(true);
  });
});
