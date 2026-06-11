import { z } from 'zod';

export const QualityProfileKindSchema = z.enum(['none', 'standard', 'strict']);

export const QualityStageKindSchema = z.enum([
  'strategy',
  'red',
  'green',
  'phase_acceptance',
  'adversarial',
  'ux',
  'acceptance',
  'closeout',
]);

export const QualityApplicabilitySchema = z
  .object({
    always: z.boolean().optional(),
    trackIsSetup: z.boolean().optional(),
    hasFrontendChanges: z.boolean().optional(),
    isFinalAcceptance: z.boolean().optional(),
    isFinalCloseout: z.boolean().optional(),
  })
  .refine(
    (val) =>
      val.always === true ||
      val.trackIsSetup === true ||
      val.hasFrontendChanges === true ||
      val.isFinalAcceptance === true ||
      val.isFinalCloseout === true,
    { message: 'At least one applicability predicate must be set' },
  );

export const QualityGateContractSchema = z.object({
  testCommand: z.string().min(1),
  maxTokens: z.number(),
  maxMs: z.number(),
  expectedFailingTests: z.number().int().nonnegative(),
  requireFailingTestCommitted: z.boolean(),
  rejectNonTestSourceChanges: z.boolean(),
});

export const QualityStagePolicySchema = z.object({
  required: z.boolean(),
  applicability: QualityApplicabilitySchema,
  role: z.enum(['executor', 'reviewer', 'merger', 'architect']),
  modelOverride: z.string().optional(),
  attempts: z.number().int().nonnegative(),
  timeoutMs: z.number().positive(),
  gate: QualityGateContractSchema.optional(),
});

export const TaskOverrideSchema = z.object({
  projectSlug: z.string(),
  taskKey: z.string(),
  profileName: z.string(),
  profileVersion: z.number().int().positive(),
  reason: z.string().min(1),
  actor: z.string().min(1),
  createdAt: z.number(),
});

export const BuiltinProfileKindSchema = QualityProfileKindSchema;

export const QualityStageSchema = z.object({
  kind: QualityStageKindSchema,
  policy: QualityStagePolicySchema,
});

export const QualityProfile = z
  .object({
    name: z.string(),
    version: z.number().int().positive(),
    kind: QualityProfileKindSchema,
    description: z.string(),
    stages: z.array(QualityStageSchema),
  })
  .superRefine((val, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < val.stages.length; i++) {
      const kind = val.stages[i].kind;
      if (seen.has(kind)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate stage kind: ${kind}`,
          path: ['stages', i, 'kind'],
        });
      }
      seen.add(kind);
    }

    const builtinNames = ['none', 'standard', 'strict'];
    if (
      builtinNames.includes(val.name) &&
      val.name !== val.kind
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Profile name "${val.name}" does not match kind "${val.kind}"`,
        path: ['kind'],
      });
    }

    if (val.kind !== 'none' && val.stages.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Profile kind "${val.kind}" requires at least one stage`,
        path: ['stages'],
      });
    }
  });

export type QualityProfileType = z.infer<typeof QualityProfile>;

export const NONE_PROFILE_NAME = 'none';

export const BUILTIN_PROFILE_NAMES: string[] = ['none', 'standard', 'strict'];

export const BUILTIN_NONE_PROFILE: QualityProfileType = Object.freeze({
  name: 'none',
  version: 1,
  kind: 'none' as const,
  description: 'No quality workflow — backward-compat identity',
  stages: [],
});

export const BUILTIN_STANDARD_PROFILE: QualityProfileType = Object.freeze({
  name: 'standard',
  version: 1,
  kind: 'standard' as const,
  description: 'Standard quality workflow covering strategy, Red, Green, and phase acceptance',
  stages: [
    {
      kind: 'strategy' as const,
      policy: {
        required: true,
        applicability: { trackIsSetup: true },
        role: 'architect' as const,
        attempts: 1,
        timeoutMs: 300_000,
      },
    },
    {
      kind: 'red' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'executor' as const,
        attempts: 1,
        timeoutMs: 600_000,
      },
    },
    {
      kind: 'green' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'executor' as const,
        attempts: 1,
        timeoutMs: 600_000,
      },
    },
    {
      kind: 'phase_acceptance' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'reviewer' as const,
        attempts: 2,
        timeoutMs: 600_000,
      },
    },
  ],
});

export const BUILTIN_STRICT_PROFILE: QualityProfileType = Object.freeze({
  name: 'strict',
  version: 1,
  kind: 'strict' as const,
  description: 'Full quality-workflow profile including adversarial, UX, acceptance, and closeout stages',
  stages: [
    {
      kind: 'strategy' as const,
      policy: {
        required: true,
        applicability: { trackIsSetup: true },
        role: 'architect' as const,
        attempts: 1,
        timeoutMs: 300_000,
      },
    },
    {
      kind: 'red' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'executor' as const,
        attempts: 1,
        timeoutMs: 600_000,
      },
    },
    {
      kind: 'green' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'executor' as const,
        attempts: 1,
        timeoutMs: 600_000,
      },
    },
    {
      kind: 'phase_acceptance' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'reviewer' as const,
        attempts: 2,
        timeoutMs: 600_000,
      },
    },
    {
      kind: 'adversarial' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'reviewer' as const,
        attempts: 1,
        timeoutMs: 600_000,
      },
    },
    {
      kind: 'ux' as const,
      policy: {
        required: false,
        applicability: { hasFrontendChanges: true },
        role: 'reviewer' as const,
        attempts: 1,
        timeoutMs: 300_000,
      },
    },
    {
      kind: 'acceptance' as const,
      policy: {
        required: true,
        applicability: { isFinalAcceptance: true },
        role: 'reviewer' as const,
        attempts: 1,
        timeoutMs: 600_000,
      },
    },
    {
      kind: 'closeout' as const,
      policy: {
        required: false,
        applicability: { isFinalCloseout: true },
        role: 'merger' as const,
        attempts: 1,
        timeoutMs: 300_000,
      },
    },
  ],
});

export const BUILTIN_PROFILES: Record<string, QualityProfileType> = {
  none: BUILTIN_NONE_PROFILE,
  standard: BUILTIN_STANDARD_PROFILE,
  strict: BUILTIN_STRICT_PROFILE,
};

/**
 * Returns the built-in profile for the given name.
 * @param name - One of 'none', 'standard', 'strict'
 */
export function getBuiltinProfile(name: string): QualityProfileType {
  const profile = BUILTIN_PROFILES[name];
  if (!profile) {
    throw new Error(`Unknown built-in profile: "${name}"`);
  }
  return profile;
}

export interface ResolvedProfile {
  profile: QualityProfileType;
  kind: string;
  source: 'default' | 'project' | 'task-override';
}

const IMMUTABLE_TAG = Symbol('immutableSnapshot');

function freezeProfile(profile: QualityProfileType): QualityProfileType {
  return Object.freeze({
    ...profile,
    stages: Object.freeze([...profile.stages.map((s) => Object.freeze({ ...s, policy: Object.freeze({ ...s.policy }) }))]),
  }) as QualityProfileType;
}

interface ResolveInput {
  projectProfile?: { name: string; version: number } | null;
  taskOverride?: {
    projectSlug: string;
    taskKey: string;
    profileName: string;
    profileVersion: number;
    reason: string;
    actor: string;
    createdAt: number;
  } | null;
}

/**
 * Resolves the effective quality profile with precedence:
 * task override > project selection > none (default).
 * Returns a frozen/immutable snapshot.
 * @param input - Optional project profile and task override
 */
export function resolveEffectiveProfile(input: ResolveInput): ResolvedProfile {
  if (input.taskOverride) {
    const builtin = BUILTIN_PROFILES[input.taskOverride.profileName];
    if (!builtin) {
      throw new Error(
        `Task override references unknown profile: "${input.taskOverride.profileName}"`,
      );
    }
    if (
      input.projectProfile &&
      input.taskOverride.profileName === input.projectProfile.name &&
      input.taskOverride.profileVersion !== input.projectProfile.version
    ) {
      throw new Error(
        `Task override references non-existent profile version: ${input.taskOverride.profileVersion}`,
      );
    }
    const snapshot: QualityProfileType = {
      ...builtin,
      version: input.taskOverride.profileVersion,
    };
    return {
      profile: freezeProfile(snapshot),
      kind: builtin.kind,
      source: 'task-override',
    };
  }

  if (input.projectProfile) {
    const builtin = BUILTIN_PROFILES[input.projectProfile.name];
    if (!builtin) {
      throw new Error(
        `Project references unknown profile: "${input.projectProfile.name}"`,
      );
    }
    const snapshot: QualityProfileType = {
      ...builtin,
      version: input.projectProfile.version,
    };
    return {
      profile: freezeProfile(snapshot),
      kind: builtin.kind,
      source: 'project',
    };
  }

  return {
    profile: freezeProfile(BUILTIN_NONE_PROFILE),
    kind: 'none',
    source: 'default',
  };
}

/**
 * Serializes a quality profile to a JSON string for snapshot storage.
 * @param profile - The quality profile to serialize
 */
export function serializeQualityProfile(profile: QualityProfileType): string {
  return JSON.stringify(profile);
}

/**
 * Parses a JSON string back into a quality profile.
 * Validates that the parsed profile matches the built-in profile shape.
 * @param json - The JSON string to parse
 */
export function parseQualityProfileSnapshot(json: string): QualityProfileType {
  const parsed = JSON.parse(json);
  const result = QualityProfile.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid quality profile snapshot: ${result.error.message}`);
  }
  const builtin = BUILTIN_PROFILES[result.data.name];
  if (!builtin) {
    throw new Error(
      `Snapshot references unknown profile: "${result.data.name}"`,
    );
  }
  return result.data;
}

/**
 * Type guard: checks whether a resolved profile result is an immutable snapshot.
 * @param value - The value to check
 */
export function isImmutableSnapshot(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (!obj.profile || typeof obj.profile !== 'object') return false;
  const profile = obj.profile as Record<string, unknown>;
  return (
    typeof profile.name === 'string' &&
    typeof profile.version === 'number' &&
    Array.isArray(profile.stages)
  );
}

const UNSAFE_SHELL_CHARS = /[|;&$`><!(){}[\]~]/;
const PYTHON_SUPERVISOR_RE = /automation-supervisor\.py/;

/**
 * Checks whether a profile configuration is safe (no arbitrary shell
 * metacharacters in gate test commands, no python supervisor references).
 * @param profile - The quality profile to validate
 */
export function isSafeProfileConfig(profile: QualityProfileType): boolean {
  for (const stage of profile.stages) {
    if (stage.policy.gate) {
      const cmd = stage.policy.gate.testCommand;
      if (UNSAFE_SHELL_CHARS.test(cmd)) return false;
      if (PYTHON_SUPERVISOR_RE.test(cmd)) return false;
    }
  }
  return true;
}
