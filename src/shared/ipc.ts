import { ProjectLoadResponse } from './board-data';

export const IPC_CHANNELS = {
  selectProject: 'project:select',
  loadProject: 'project:load',
  refreshBoard: 'board:refresh',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export interface ProjectApi {
  selectProject(): Promise<ProjectLoadResponse>;
  loadProject(projectPath: string): Promise<ProjectLoadResponse>;
  refreshBoard(projectPath: string): Promise<ProjectLoadResponse>;
}
