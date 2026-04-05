import type { Task } from './types';

const PRIORITY_MAP: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function extractPriority(title: string): number {
  const match = title.match(/priority:(critical|high|medium|low)/i);
  if (match) {
    return PRIORITY_MAP[match[1].toLowerCase()] ?? 3;
  }
  return 3;
}

export class TaskQueue {
  private items: Task[] = [];
  private enqueueOrder = 0;
  private orderMap = new Map<string, number>();

  enqueue(task: Task): void {
    this.items.push(task);
    this.orderMap.set(task.taskKey, this.enqueueOrder++);
    this.items.sort((a, b) => {
      const pa = extractPriority(a.title);
      const pb = extractPriority(b.title);
      if (pa !== pb) return pa - pb;
      return (this.orderMap.get(a.taskKey) ?? 0) - (this.orderMap.get(b.taskKey) ?? 0);
    });
  }

  dequeue(): Task | null {
    if (this.items.length === 0) return null;
    const task = this.items.shift()!;
    this.orderMap.delete(task.taskKey);
    return task;
  }

  peek(): Task | null {
    return this.items.length > 0 ? this.items[0] : null;
  }

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
    this.orderMap.clear();
  }
}
