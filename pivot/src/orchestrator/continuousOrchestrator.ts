import type { Task } from './types';

type Logger = { log: (message: string) => void };
type CycleFn = () => Promise<void>;

export class ContinuousOrchestrator {
  private loadTasks: () => Promise<Task[]>;
  private logger: Logger;
  private onCycle?: CycleFn;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(
    loadTasks: () => Promise<Task[]>,
    logger: Logger = { log: console.log },
    onCycle?: CycleFn,
  ) {
    this.loadTasks = loadTasks;
    this.logger = logger;
    this.onCycle = onCycle;
  }

  private lastTasks: Task[] = [];

  isIdle(): boolean {
    const readyTasks = this.lastTasks.filter(
      (t) => t.status === 'todo' || t.status === 'ready' || t.status === 'blocked',
    );
    return readyTasks.length === 0;
  }

  async runCycle(): Promise<void> {
    const tasks = await this.loadTasks();
    this.lastTasks = tasks;
    const readyTasks = tasks.filter(
      (t) => t.status === 'todo' || t.status === 'ready' || t.status === 'blocked',
    );

    if (readyTasks.length === 0) {
      this.logger.log('idle — skipping cycle');
      return;
    }

    this.logger.log(`dispatching ${readyTasks.length} tasks`);
    if (this.onCycle) {
      await this.onCycle();
    }
  }

  start(intervalMs: number): void {
    if (this.running) return;
    this.running = true;
    this.tick(intervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private tick(intervalMs: number): void {
    if (!this.running) return;
    this.timerId = setTimeout(async () => {
      if (!this.running) return;
      try {
        await this.runCycle();
      } catch (err) {
        this.logger.log(`cycle error: ${err}`);
      }
      this.tick(intervalMs);
    }, intervalMs);
  }
}
