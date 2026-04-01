export type ProjectDto = {
  slug: string;
  name: string;
  rootPath: string;
  status: 'active' | 'paused' | 'archived';
  source: 'manual' | 'scanner' | 'import';
  updatedAt: number;
};

export type UpsertProjectInput = {
  slug: string;
  name: string;
  rootPath: string;
  status?: 'active' | 'paused' | 'archived';
  source?: 'manual' | 'scanner' | 'import';
};

export type TrackSnapshotDto = {
  projectSlug: string;
  trackId: string;
  title: string;
  status: 'new' | 'active' | 'blocked' | 'complete' | 'archived';
  specMarkdown: string;
  planMarkdown: string;
  version: number;
  updatedAt: number;
};
