// Factory functions and mock Convex client for the Virtual Software House MVP schema.
// Task type aligns with orchestrator/types.ts Task interface.

export type TaskStatus = 'todo' | 'ready' | 'in_progress' | 'blocked' | 'done';

export interface Project {
  name: string;
  description: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: number;
}

export interface Sprint {
  projectId: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  startDate: number;
  endDate: number;
  goal?: string;
  updatedAt: number;
}

export interface Board {
  projectId: string;
  name: string;
  createdAt: number;
}

export interface Column {
  boardId: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface Task {
  _id: string;
  projectSlug: string;
  trackId: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  assignee?: string;
  dependencies: string[];
  updatedAt: number;
  retryCount?: number;
  startedAt?: number;
  lastDispatchAttemptAt?: number;
  sessionId?: string;
  tags?: Record<string, string>;
  skills?: string[];
  spec?: string;
}

export interface Employee {
  _id: string;
  name: string;
  role: string;
  skills: string[];
  model: string;
  status: 'active' | 'away';
  createdAt: number;
}

export interface Run {
  taskId: string;
  employeeId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  output?: string;
  startedAt: number;
  finishedAt?: number;
}

export function createProject(overrides: Partial<Project> = {}): Project {
  return {
    name: 'Demo Project',
    description: 'A demo project for testing',
    status: 'active',
    createdAt: Date.now(),
    ...overrides,
  };
}

let _taskCounter = 0;
let _employeeCounter = 0;

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    _id: `task-${++_taskCounter}`,
    projectSlug: 'demo-project',
    trackId: 'track-1',
    taskKey: `task-${_taskCounter}`,
    title: 'Demo Task',
    status: 'todo',
    dependencies: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    _id: `emp-${++_employeeCounter}`,
    name: 'Demo Employee',
    role: 'developer',
    skills: ['typescript', 'react'],
    model: 'gpt-4',
    status: 'active',
    createdAt: Date.now(),
    ...overrides,
  };
}

// --- Mock Convex Client ---

type QueryHandler = (args: Record<string, unknown>) => unknown | Promise<unknown>;
type MutationHandler = (args: Record<string, unknown>) => unknown | Promise<unknown>;

export interface MockConvexClient {
  query: (fn: unknown, args?: Record<string, unknown>) => Promise<unknown>;
  mutation: (fn: unknown, args?: Record<string, unknown>) => Promise<unknown>;
  /** Register a handler for a query path (e.g., 'fleetCatalog:listAgents') */
  onQuery: (path: string, handler: QueryHandler) => void;
  /** Register a handler for a mutation path */
  onMutation: (path: string, handler: MutationHandler) => void;
  /** Clear all registered handlers */
  clear: () => void;
}

function resolveFunctionPath(fn: unknown): string {
  if (typeof fn === 'string') return fn;
  if (typeof fn === 'object' && fn !== null && '_name' in fn) {
    return (fn as { _name: string })._name;
  }
  if (typeof fn === 'function' && fn.name) return fn.name;
  return String(fn);
}

export function createMockConvexClient(
  handlers: Record<string, QueryHandler | MutationHandler> = {},
): MockConvexClient {
  const registry = new Map<string, QueryHandler | MutationHandler>(
    Object.entries(handlers),
  );

  return {
    async query(fn: unknown, args: Record<string, unknown> = {}) {
      const path = resolveFunctionPath(fn);
      const handler = registry.get(path);
      if (!handler) {
        throw new Error(`No mock handler registered for query: ${path}`);
      }
      return handler(args);
    },

    async mutation(fn: unknown, args: Record<string, unknown> = {}) {
      const path = resolveFunctionPath(fn);
      const handler = registry.get(path);
      if (!handler) {
        throw new Error(`No mock handler registered for mutation: ${path}`);
      }
      return handler(args);
    },

    onQuery(path: string, handler: QueryHandler) {
      registry.set(path, handler);
    },

    onMutation(path: string, handler: MutationHandler) {
      registry.set(path, handler);
    },

    clear() {
      registry.clear();
    },
  };
}
