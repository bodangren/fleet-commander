import { describe, expect, it, beforeEach } from 'bun:test';
import { TaskQueue } from './taskQueue';
import type { Task } from './types';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  it('enqueues and dequeues tasks', () => {
    const task: Task = {
      projectSlug: 'p',
      trackId: 't',
      taskKey: 't1',
      title: 'Test task',
      status: 'todo',
      dependencies: [],
      updatedAt: 0,
    };
    queue.enqueue(task);
    expect(queue.size).toBe(1);
    const dequeued = queue.dequeue();
    expect(dequeued).not.toBeNull();
    expect(dequeued!.taskKey).toBe('t1');
    expect(queue.size).toBe(0);
  });

  it('returns null when dequeuing from empty queue', () => {
    expect(queue.dequeue()).toBeNull();
  });

  it('orders tasks by priority: critical > high > medium > low', () => {
    const low: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 'low',
      title: 'Low priority', status: 'todo', dependencies: [], updatedAt: 0,
    };
    const high: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 'high',
      title: 'priority:high Critical', status: 'todo', dependencies: [], updatedAt: 0,
    };
    const critical: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 'critical',
      title: 'priority:critical Emergency', status: 'todo', dependencies: [], updatedAt: 0,
    };
    const medium: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 'medium',
      title: 'priority:medium Normal', status: 'todo', dependencies: [], updatedAt: 0,
    };

    queue.enqueue(low);
    queue.enqueue(high);
    queue.enqueue(critical);
    queue.enqueue(medium);

    expect(queue.dequeue()!.taskKey).toBe('critical');
    expect(queue.dequeue()!.taskKey).toBe('high');
    expect(queue.dequeue()!.taskKey).toBe('medium');
    expect(queue.dequeue()!.taskKey).toBe('low');
  });

  it('uses FIFO tie-breaking for same priority', () => {
    const first: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 'first',
      title: 'First task', status: 'todo', dependencies: [], updatedAt: 0,
    };
    const second: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 'second',
      title: 'Second task', status: 'todo', dependencies: [], updatedAt: 0,
    };

    queue.enqueue(first);
    queue.enqueue(second);

    expect(queue.dequeue()!.taskKey).toBe('first');
    expect(queue.dequeue()!.taskKey).toBe('second');
  });

  it('reports correct queue size', () => {
    const t1: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 't1',
      title: 'Task 1', status: 'todo', dependencies: [], updatedAt: 0,
    };
    const t2: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 't2',
      title: 'Task 2', status: 'todo', dependencies: [], updatedAt: 0,
    };

    queue.enqueue(t1);
    queue.enqueue(t2);
    expect(queue.size).toBe(2);

    queue.dequeue();
    expect(queue.size).toBe(1);
  });

  it('clears the queue', () => {
    const task: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 't1',
      title: 'Task', status: 'todo', dependencies: [], updatedAt: 0,
    };
    queue.enqueue(task);
    queue.clear();
    expect(queue.size).toBe(0);
    expect(queue.dequeue()).toBeNull();
  });

  it('peeks at the next task without removing it', () => {
    const task: Task = {
      projectSlug: 'p', trackId: 't', taskKey: 't1',
      title: 'Task', status: 'todo', dependencies: [], updatedAt: 0,
    };
    queue.enqueue(task);
    const peeked = queue.peek();
    expect(peeked).not.toBeNull();
    expect(peeked!.taskKey).toBe('t1');
    expect(queue.size).toBe(1);
  });
});
