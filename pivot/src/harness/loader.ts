import yaml from 'js-yaml';
import { readFileSync, watchFile, unwatchFile } from 'fs';
import { HarnessProfile, isHarnessProfile } from '../shared/harnessProfile';

export interface LoadedHarness {
  name: string;
  profile: HarnessProfile;
  filePath: string;
}

const HARNESS_DIR = './conductor/harnesses';

/**
 * Loads and parses a single harness YAML file into a LoadedHarness object
 * @param filePath - Path to the harness YAML file
 * @returns LoadedHarness object or null if loading fails
 */
export function loadHarnessFromFile(filePath: string): LoadedHarness | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = yaml.load(content, { schema: yaml.DEFAULT_SCHEMA });
    const profile = HarnessProfile.parse(data);
    return {
      name: profile.name,
      profile,
      filePath,
    };
  } catch (err) {
    console.error(`Failed to load harness from ${filePath}:`, err);
    return null;
  }
}

/**
 * Loads all .yaml/.yml harness files from the harnesses directory
 * @returns Array of LoadedHarness objects
 */
export function loadAllHarnesses(): LoadedHarness[] {
  const { readdirSync } = require('fs');
  const { join } = require('path');

  const harnesses: LoadedHarness[] = [];

  try {
    const files = readdirSync(HARNESS_DIR);
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const filePath = join(HARNESS_DIR, file);
        const loaded = loadHarnessFromFile(filePath);
        if (loaded) {
          harnesses.push(loaded);
        }
      }
    }
  } catch (err) {
    console.error(`Failed to read harness directory:`, err);
  }

  return harnesses;
}

const watchers = new Map<string, boolean>();

/**
 * Watches harness YAML files and calls onChange callback on modifications
 * @param onChange - Callback function invoked with harness name and profile on changes
 */
export function watchHarnesses(onChange: (name: string, profile: HarnessProfile | null) => void): void {
  const { readdirSync } = require('fs');
  const { join } = require('path');

  try {
    const files = readdirSync(HARNESS_DIR);
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const filePath = join(HARNESS_DIR, file);
        if (!watchers.has(filePath)) {
          watchFile(filePath, { interval: 1000 }, () => {
            const loaded = loadHarnessFromFile(filePath);
            if (loaded) {
              onChange(loaded.name, loaded.profile);
            } else {
              onChange(file, null);
            }
          });
          watchers.set(filePath, true);
        }
      }
    }
  } catch (err) {
    console.error(`Failed to watch harness directory:`, err);
  }
}

/**
 * Stops watching all harness files
 */
export function unwatchAllHarnesses(): void {
  for (const filePath of watchers.keys()) {
    unwatchFile(filePath);
  }
  watchers.clear();
}

/**
 * Converts a HarnessProfile to a database entry object
 * @param profile - The HarnessProfile to convert
 * @returns Database entry object with serialized JSON fields
 */
export function profileToDbEntry(profile: HarnessProfile) {
  const invocationFlags = (profile.invocation as any).flags || {};
  const capabilities = (profile.capabilities as any) || {
    supportedTaskClasses: ['feature'],
    supportsContinuousMode: false,
    maxConcurrentTasks: 1,
    supportedLlmProviders: [],
  };
  const policy = (profile.policy as any) || {
    allowed_task_classes: [],
    concurrency_limit: 1,
    retry_with_human_review_on_failure: false,
  };
  const discovery = (profile.discovery as any) || {};

  return {
    name: profile.name,
    binary: profile.binary,
    discoveryCommand: discovery.command,
    discoveryParseStrategy: discovery.parse_strategy,
    discoveryPattern: discovery.pattern,
    discoveryNotes: discovery.notes,
    invocationTemplate: (profile.invocation as any).template,
    invocationFlagsJson: JSON.stringify(invocationFlags),
    capabilitiesJson: JSON.stringify(capabilities),
    policyJson: JSON.stringify(policy),
  };
}