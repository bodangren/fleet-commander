import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  QualityProfile,
  QualityProfileKindSchema,
  isSafeProfileConfig,
  BUILTIN_NONE_PROFILE,
  BUILTIN_PROFILES,
} from '../pivot/src/shared/qualityProfile';
import type { QualityProfileType } from '../pivot/src/shared/qualityProfile';

const BUILTIN_MAP: Record<string, QualityProfileType> = {
  none: BUILTIN_NONE_PROFILE,
  standard: BUILTIN_PROFILES.standard,
  strict: BUILTIN_PROFILES.strict,
};

function assertActor(actor: string) {
  if (!actor || actor.trim() === '') {
    throw new Error('Actor is required');
  }
}

function assertValidProfile(profile: unknown): asserts profile is QualityProfileType {
  const result = QualityProfile.safeParse(profile);
  if (!result.success) {
    throw new Error(`Invalid profile: ${result.error.message}`);
  }
  if (!isSafeProfileConfig(result.data)) {
    throw new Error('Profile configuration is unsafe');
  }
}

function assertNameMatchesKind(profile: { name: string; kind: string }) {
  const builtinKinds = ['none', 'standard', 'strict'];
  if (builtinKinds.includes(profile.kind) && profile.name !== profile.kind) {
    throw new Error(
      `Profile name "${profile.name}" does not match kind "${profile.kind}"`,
    );
  }
}

export async function listProfilesHandler(ctx: any) {
  const docs = await ctx.db.query('qualityProfiles').collect();
  const grouped = new Map<string, any[]>();
  for (const doc of docs) {
    const existing = grouped.get(doc.name) ?? [];
    existing.push(doc);
    grouped.set(doc.name, existing);
  }
  const result: any[] = [];
  for (const versions of grouped.values()) {
    versions.sort((a: any, b: any) => b.version - a.version);
    result.push(versions[0]);
  }
  return result;
}

export async function getProfileHandler(
  ctx: any,
  args: { name: string; version: number },
) {
  const docs = await ctx.db
    .query('qualityProfiles')
    .withIndex('by_name_version', (q: any) =>
      q.eq('name', args.name).eq('version', args.version),
    )
    .collect();
  return docs[0] ?? null;
}

export async function publishProfileVersionHandler(
  ctx: any,
  args: { profile: any; actor: string; now: number },
) {
  assertActor(args.actor);
  assertNameMatchesKind(args.profile);
  assertValidProfile(args.profile);

  const profile = QualityProfile.parse(args.profile);
  if (profile.version <= 0) {
    throw new Error('Version must be positive');
  }

  if (profile.version > 1) {
    const prev = await getProfileHandler(ctx, {
      name: profile.name,
      version: profile.version - 1,
    });
    if (!prev) {
      throw new Error(
        `Cannot publish version ${profile.version} without version ${profile.version - 1}`,
      );
    }
  }

  const existing = await getProfileHandler(ctx, {
    name: profile.name,
    version: profile.version,
  });

  if (existing) {
    await ctx.db.patch(existing._id, {
      ...profile,
      updatedAt: args.now,
    });
    return { ...profile, updatedAt: args.now };
  }

  const doc = {
    ...profile,
    updatedAt: args.now,
  };
  await ctx.db.insert('qualityProfiles', doc);
  return doc;
}

export async function selectProjectProfileHandler(
  ctx: any,
  args: { selection: any; now: number },
) {
  const { selection } = args;
  assertActor(selection.actor);

  const published = await getProfileHandler(ctx, {
    name: selection.profileName,
    version: selection.profileVersion,
  });
  if (!published) {
    throw new Error(
      `Profile "${selection.profileName}" version ${selection.profileVersion} not found`,
    );
  }

  const existingSelections = await ctx.db
    .query('projectProfileSelections')
    .withIndex('by_project', (q: any) =>
      q.eq('projectSlug', selection.projectSlug),
    )
    .collect();

  const doc = {
    projectSlug: selection.projectSlug,
    profileName: selection.profileName,
    profileVersion: selection.profileVersion,
    actor: selection.actor,
    createdAt: args.now,
  };

  if (existingSelections.length > 0) {
    await ctx.db.patch(existingSelections[0]._id, doc);
  } else {
    await ctx.db.insert('projectProfileSelections', doc);
  }

  return doc;
}

export async function setTaskOverrideHandler(
  ctx: any,
  args: { override: any; now: number },
) {
  const { override } = args;
  assertActor(override.reason);
  assertActor(override.actor);

  const published = await getProfileHandler(ctx, {
    name: override.profileName,
    version: override.profileVersion,
  });
  if (!published) {
    throw new Error(
      `Profile "${override.profileName}" version ${override.profileVersion} not found`,
    );
  }

  const doc = {
    projectSlug: override.projectSlug,
    taskKey: override.taskKey,
    profileName: override.profileName,
    profileVersion: override.profileVersion,
    reason: override.reason,
    actor: override.actor,
    createdAt: args.now,
  };

  await ctx.db.insert('taskOverrides', doc);
  return doc;
}

export async function recordClaimedRunProfileHandler(
  ctx: any,
  args: { projectSlug: string; taskKey: string; runId: string; now: number },
) {
  const existing = await ctx.db
    .query('runProfileSnapshots')
    .withIndex('by_runId', (q: any) => q.eq('runId', args.runId))
    .collect();

  if (existing.length > 0) {
    throw new Error(`Run profile snapshot already exists for runId: ${args.runId}`);
  }

  const effective = await getEffectiveTaskProfileHandler(ctx, {
    projectSlug: args.projectSlug,
    taskKey: args.taskKey,
  });

  const doc = {
    projectSlug: args.projectSlug,
    taskKey: args.taskKey,
    runId: args.runId,
    profileName: effective.profileName,
    profileVersion: effective.profileVersion,
    immutable: true,
    createdAt: args.now,
  };

  await ctx.db.insert('runProfileSnapshots', doc);
  return doc;
}

export async function getEffectiveProjectProfileHandler(
  ctx: any,
  args: { projectSlug: string },
) {
  const selections = await ctx.db
    .query('projectProfileSelections')
    .withIndex('by_project', (q: any) =>
      q.eq('projectSlug', args.projectSlug),
    )
    .collect();

  if (selections.length > 0) {
    const sel = selections[0];
    return {
      profileName: sel.profileName,
      profileVersion: sel.profileVersion,
      source: 'project' as const,
    };
  }

  return {
    profileName: BUILTIN_NONE_PROFILE.name,
    profileVersion: 0,
    source: 'default' as const,
  };
}

export async function getEffectiveTaskProfileHandler(
  ctx: any,
  args: { projectSlug: string; taskKey: string },
) {
  const overrides = await ctx.db
    .query('taskOverrides')
    .withIndex('by_project_task', (q: any) =>
      q.eq('projectSlug', args.projectSlug).eq('taskKey', args.taskKey),
    )
    .collect();

  if (overrides.length > 0) {
    const sorted = overrides.sort((a: any, b: any) => b.createdAt - a.createdAt);
    const latest = sorted[0];
    return {
      profileName: latest.profileName,
      profileVersion: latest.profileVersion,
      source: 'task-override' as const,
    };
  }

  return getEffectiveProjectProfileHandler(ctx, {
    projectSlug: args.projectSlug,
  });
}

export async function getRunProfileSnapshotHandler(
  ctx: any,
  args: { projectSlug: string; taskKey: string; runId: string },
) {
  const snapshots = await ctx.db
    .query('runProfileSnapshots')
    .withIndex('by_runId', (q: any) => q.eq('runId', args.runId))
    .collect();

  return snapshots[0] ?? null;
}

export async function listProjectOverridesHandler(
  ctx: any,
  args: { projectSlug: string; taskKey: string },
) {
  const overrides = await ctx.db
    .query('taskOverrides')
    .withIndex('by_project_task', (q: any) =>
      q.eq('projectSlug', args.projectSlug).eq('taskKey', args.taskKey),
    )
    .collect();

  return overrides.sort((a: any, b: any) => a.createdAt - b.createdAt);
}

export async function listProjectSelectionsHandler(
  ctx: any,
  args: { projectSlug: string },
) {
  return ctx.db
    .query('projectProfileSelections')
    .withIndex('by_project', (q: any) =>
      q.eq('projectSlug', args.projectSlug),
    )
    .collect();
}

export const getEffectiveTaskProfile = query({
  args: {
    projectSlug: v.string(),
    taskKey: v.string(),
  },
  handler: getEffectiveTaskProfileHandler,
});

export const recordClaimedRunProfile = mutation({
  args: {
    projectSlug: v.string(),
    taskKey: v.string(),
    runId: v.string(),
    now: v.number(),
  },
  handler: recordClaimedRunProfileHandler,
});
