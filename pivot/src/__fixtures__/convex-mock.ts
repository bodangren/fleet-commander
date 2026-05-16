// Factory functions for the simplified schema (Virtual Software House MVP)
// These match the expected new minimal schema shapes.

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
  title: string;
  description: string;
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  projectId: string;
  columnId?: string;
  spec?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Employee {
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

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    title: 'Demo Task',
    description: 'A demo task for testing',
    status: 'backlog',
    priority: 'medium',
    projectId: 'demo-project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    name: 'Demo Employee',
    role: 'developer',
    skills: ['typescript', 'react'],
    model: 'gpt-4',
    status: 'active',
    createdAt: Date.now(),
    ...overrides,
  };
}
