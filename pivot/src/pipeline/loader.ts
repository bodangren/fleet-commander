import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import yaml from 'js-yaml';
import { ZodError } from 'zod';
import {
  PipelineSchema,
  PipelinesFileSchema,
  type Pipeline,
  type PipelinesFile,
} from './types.js';

const DEFAULT_PATH = 'conductor/pipelines.yml';

export class PipelineLoadError extends Error {
  constructor(
    message: string,
    public readonly details?: string,
  ) {
    super(details ? `${message}: ${details}` : message);
    this.name = 'PipelineLoadError';
  }
}

/**
 * Loads and validates pipeline YAML configuration with duplicate and circular dependency checks.
 * @param path - Path to the pipelines.yml file
 * @returns The validated pipelines file
 */
export async function loadPipelines(
  path: string = DEFAULT_PATH,
): Promise<PipelinesFile> {
  if (!existsSync(path)) {
    throw new PipelineLoadError(
      `Pipeline file not found: ${path}`,
      `Expected a pipelines.yml file at ${path}`,
    );
  }

  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch (err) {
    throw new PipelineLoadError(
      `Failed to read pipeline file: ${path}`,
      err instanceof Error ? err.message : String(err),
    );
  }

  const parsed = parseYaml(raw);

  try {
    const validated = PipelinesFileSchema.parse(parsed);
    validateNoDuplicateNames(validated.pipelines);
    validateNoCircularDeps(validated.pipelines);
    return validated;
  } catch (err) {
    if (err instanceof PipelineLoadError) throw err;
    if (err instanceof ZodError) {
      const details = err.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new PipelineLoadError('Invalid pipeline schema', details);
    }
    throw new PipelineLoadError(
      'Invalid pipeline schema',
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Parse YAML string into JavaScript object using js-yaml.
 * @param raw - Raw YAML string
 * @returns Parsed JavaScript object
 */
export function parseYaml(raw: string): unknown {
  return yaml.load(raw, { schema: yaml.DEFAULT_SCHEMA });
}

/**
 * Validate no duplicate pipeline names exist.
 * @param pipelines - Array of pipelines to validate
 */
function validateNoDuplicateNames(pipelines: Pipeline[]): void {
  const names = new Set<string>();
  for (const pipeline of pipelines) {
    if (names.has(pipeline.name)) {
      throw new PipelineLoadError(
        `Duplicate pipeline name: ${pipeline.name}`,
        'Each pipeline must have a unique name',
      );
    }
    names.add(pipeline.name);
  }
}

/**
 * Validate no circular dependencies exist across all pipeline steps.
 * @param pipelines - Array of pipelines to validate
 */
function validateNoCircularDeps(pipelines: Pipeline[]): void {
  const stepNames = new Set<string>();
  for (const pipeline of pipelines) {
    for (const stage of pipeline.stages) {
      for (const step of stage.steps) {
        if (step.name) {
          stepNames.add(step.name);
        }
      }
    }
  }

  for (const pipeline of pipelines) {
    for (const stage of pipeline.stages) {
      for (const step of stage.steps) {
        if (step.depends_on) {
          for (const dep of step.depends_on) {
            if (!stepNames.has(dep)) {
              throw new PipelineLoadError(
                `Invalid dependency: step "${dep}" not found`,
                `Step "${step.name}" in stage "${stage.name}" depends on "${dep}" which does not exist`,
              );
            }
          }
        }
      }
    }
  }
}
