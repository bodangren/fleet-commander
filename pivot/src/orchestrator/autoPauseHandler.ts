import type { ContinuousModeManager } from './continuousMode';

type AlertFn = (projectSlug: string, taskKey: string, error: string) => Promise<void>;

export class AutoPauseHandler {
  private manager: ContinuousModeManager;
  private createAlert: AlertFn;

  constructor(manager: ContinuousModeManager, createAlert: AlertFn) {
    this.manager = manager;
    this.createAlert = createAlert;
  }

  async recordFailure(projectSlug: string, taskKey: string, error: string): Promise<void> {
    if (this.manager.isPaused()) {
      return;
    }
    this.manager.recordFailure();

    if (this.manager.shouldAutoPause()) {
      this.manager.autoPause();
      await this.createAlert(projectSlug, taskKey, error);
    }
  }

  async recordSuccess(): Promise<void> {
    this.manager.recordSuccess();
  }
}
