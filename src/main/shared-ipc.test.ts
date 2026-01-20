import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from '../shared/ipc';
import type { ProjectLoadResponse } from '../shared/board-data';

describe('IPC_CHANNELS', () => {
  it('defines stable channel names', () => {
    expect(IPC_CHANNELS.selectProject).toBe('project:select');
    expect(IPC_CHANNELS.loadProject).toBe('project:load');
    expect(IPC_CHANNELS.refreshBoard).toBe('board:refresh');
    expect(IPC_CHANNELS.getPlanDetails).toBe('plan:detail');
    expect(IPC_CHANNELS.getLastProjectPath).toBe('project:last-used');
    expect(IPC_CHANNELS.updateTaskStatus).toBe('task:update');
  });

  it('supports typed project load responses', () => {
    const response: ProjectLoadResponse = {
      ok: true,
      data: {
        projectPath: '/repo/path',
        tracks: [],
        tasks: [],
      },
    };

    expect(response.ok).toBe(true);
  });
});
