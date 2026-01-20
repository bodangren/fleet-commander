import { ProjectLoadResponse } from './board-data';
import type { TaskUpdateRequest, TaskUpdateResponse } from './task-update';
import type { PlanDetailRequest, PlanDetailResponse } from './plan-detail';

export const IPC_CHANNELS = {
  selectProject: 'project:select',
  loadProject: 'project:load',
  refreshBoard: 'board:refresh',
  getPlanDetails: 'plan:detail',
  getLastProjectPath: 'project:last-used',
  updateTaskStatus: 'task:update',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export interface ProjectApi {
  selectProject(): Promise<ProjectLoadResponse>;
  loadProject(projectPath: string): Promise<ProjectLoadResponse>;
  refreshBoard(projectPath: string): Promise<ProjectLoadResponse>;
  getPlanDetails(request: PlanDetailRequest): Promise<PlanDetailResponse>;
  getLastProjectPath(): Promise<string | null>;
  updateTaskStatus(request: TaskUpdateRequest): Promise<TaskUpdateResponse>;
}
