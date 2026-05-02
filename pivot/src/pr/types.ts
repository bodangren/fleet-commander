export interface PRInfo {
  url: string;
  number: number;
  status: 'open' | 'merged' | 'closed';
  branch: string;
  baseBranch: string;
}

export interface PRCreateOptions {
  title: string;
  body: string;
  branch: string;
  baseBranch?: string;
  draft?: boolean;
}

export interface PRClient {
  create(options: PRCreateOptions): Promise<PRInfo>;
  getStatus(prNumber: number): Promise<PRInfo>;
  merge(prNumber: number): Promise<void>;
}

export interface PRDescriptionContext {
  taskId: string;
  taskTitle: string;
  trackId?: string;
  specSummary?: string;
  acceptanceCriteria?: string[];
  agentSummary?: string;
  commitHash?: string;
}
