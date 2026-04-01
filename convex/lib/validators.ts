import { v } from 'convex/values';

export const projectStatus = v.union(
  v.literal('active'),
  v.literal('paused'),
  v.literal('archived'),
);

export const sourceKind = v.union(
  v.literal('manual'),
  v.literal('scanner'),
  v.literal('import'),
);

export const trackStatus = v.union(
  v.literal('new'),
  v.literal('active'),
  v.literal('blocked'),
  v.literal('complete'),
  v.literal('archived'),
);

export const taskStatus = v.union(
  v.literal('todo'),
  v.literal('ready'),
  v.literal('in_progress'),
  v.literal('blocked'),
  v.literal('done'),
);

export const issueStatus = v.union(
  v.literal('open'),
  v.literal('triaged'),
  v.literal('resolved'),
  v.literal('closed'),
);

export const runStatus = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('succeeded'),
  v.literal('failed'),
  v.literal('cancelled'),
);
