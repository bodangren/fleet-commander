import { ProjectLoadResponse } from './board-data';
import type { TaskUpdateRequest, TaskUpdateResponse } from './task-update';

export const IPC_CHANNELS = {
  selectProject: 'project:select',
  loadProject: 'project:load',
  refreshBoard: 'board:refresh',
  getLastProjectPath: 'project:last-used',
  updateTaskStatus: 'task:update',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export interface ProjectApi {
  selectProject(): Promise<ProjectLoadResponse>;
  loadProject(projectPath: string): Promise<ProjectLoadResponse>;
  refreshBoard(projectPath: string): Promise<ProjectLoadResponse>;
  getLastProjectPath(): Promise<string | null>;
  updateTaskStatus(request: TaskUpdateRequest): Promise<TaskUpdateResponse>;
}
