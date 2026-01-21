import { ProjectLoadResponse } from './board-data';
import type { TaskUpdateRequest, TaskUpdateResponse } from './task-update';
import type { PlanDetailRequest, PlanDetailResponse } from './plan-detail';
import type { PlanUpdateRequest, PlanUpdateResponse } from './plan-update';
import type {
  TerminalCloseRequest,
  TerminalCloseResponse,
  TerminalCreateRequest,
  TerminalCreateResponse,
  TerminalDataEvent,
  TerminalWriteRequest,
  TerminalWriteResponse,
} from './terminal';

export const IPC_CHANNELS = {
  selectProject: 'project:select',
  loadProject: 'project:load',
  refreshBoard: 'board:refresh',
  getPlanDetails: 'plan:detail',
  updatePlanContents: 'plan:update',
  getLastProjectPath: 'project:last-used',
  updateTaskStatus: 'task:update',
  menuProjectLoad: 'project:menu-load',
  terminalCreate: 'terminal:create',
  terminalWrite: 'terminal:write',
  terminalClose: 'terminal:close',
  terminalData: 'terminal:data',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export interface ProjectApi {
  selectProject(): Promise<ProjectLoadResponse>;
  loadProject(projectPath: string): Promise<ProjectLoadResponse>;
  refreshBoard(projectPath: string): Promise<ProjectLoadResponse>;
  getPlanDetails(request: PlanDetailRequest): Promise<PlanDetailResponse>;
  updatePlanContents(request: PlanUpdateRequest): Promise<PlanUpdateResponse>;
  getLastProjectPath(): Promise<string | null>;
  updateTaskStatus(request: TaskUpdateRequest): Promise<TaskUpdateResponse>;
}

export interface TerminalApi {
  createSession(request: TerminalCreateRequest): Promise<TerminalCreateResponse>;
  writeToSession(request: TerminalWriteRequest): Promise<TerminalWriteResponse>;
  closeSession(request: TerminalCloseRequest): Promise<TerminalCloseResponse>;
  onSessionData(listener: (event: unknown, payload: TerminalDataEvent) => void): void;
  offSessionData(listener: (event: unknown, payload: TerminalDataEvent) => void): void;
}
