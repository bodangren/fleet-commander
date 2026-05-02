import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import yaml from 'js-yaml';
import { DEFAULT_WEIGHTS, type ScoreWeights } from './scoring';

const PRESETS_PATH = join(homedir(), '.measure-fleet', 'weight-presets.yaml');

interface PresetsFile {
  active: string;
  projectOverrides?: Record<string, string>;
  presets: Record<string, Partial<ScoreWeights>>;
}

let cachedFile: PresetsFile | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

function loadPresetsFile(): PresetsFile {
  const now = Date.now();
  if (cachedFile && now - cachedAt < CACHE_TTL_MS) {
    return cachedFile;
  }

  if (!existsSync(PRESETS_PATH)) {
    const fallback: PresetsFile = { active: 'default', presets: { default: { ...DEFAULT_WEIGHTS } } };
    cachedFile = fallback;
    cachedAt = now;
    return fallback;
  }

  const content = readFileSync(PRESETS_PATH, 'utf8');
  const parsed = yaml.load(content, { schema: yaml.DEFAULT_SCHEMA }) as PresetsFile;

  if (!parsed.presets || typeof parsed.presets !== 'object') {
    throw new Error(`Invalid weight-presets.yaml: missing 'presets' map`);
  }

  cachedFile = parsed;
  cachedAt = now;
  return parsed;
}

export function getActivePresetName(projectSlug?: string): string {
  const file = loadPresetsFile();
  if (projectSlug && file.projectOverrides?.[projectSlug]) {
    return file.projectOverrides[projectSlug];
  }
  return file.active ?? 'default';
}

export function loadWeights(projectSlug?: string): ScoreWeights {
  const file = loadPresetsFile();
  const presetName = getActivePresetName(projectSlug);
  const preset = file.presets[presetName];

  if (!preset) {
    console.warn(`[weights] Preset '${presetName}' not found, falling back to default`);
    return { ...DEFAULT_WEIGHTS };
  }

  return { ...DEFAULT_WEIGHTS, ...preset };
}

export function loadDispatchOptions(projectSlug?: string): { weights: ScoreWeights; epsilon: number } {
  const file = loadPresetsFile();
  const presetName = getActivePresetName(projectSlug);
  const preset = file.presets[presetName] ?? {};
  const epsilon = (preset as Record<string, unknown>).epsilon as number | undefined;
  return {
    weights: loadWeights(projectSlug),
    epsilon: epsilon ?? 0.1,
  };
}

export function listPresets(): string[] {
  const file = loadPresetsFile();
  return Object.keys(file.presets);
}

export function getPresetPath(): string {
  return PRESETS_PATH;
}
