import { describe, expect, it } from 'bun:test';
import { generateDemoProject, generateDemoTasks, generateDemoEmployees } from './seed';
import type { Project, Task, Employee } from '../pivot/src/__fixtures__/convex-mock';

describe('seed demo data', () => {
  it('generateDemoProject returns a valid project', () => {
    const project = generateDemoProject() as Project;
    expect(project).toBeDefined();
    expect(project.name).toBeTruthy();
    expect(project.status).toMatch(/active|paused|archived/);
    expect(project.createdAt).toBeGreaterThan(0);
  });

  it('generateDemoTasks returns an array of valid tasks', () => {
    const tasks = generateDemoTasks('demo-project') as Task[];
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
    for (const task of tasks) {
      expect(task.title).toBeTruthy();
      expect(task.projectId).toBe('demo-project');
      expect(task.status).toBeDefined();
      expect(task.priority).toMatch(/low|medium|high/);
    }
  });

  it('generateDemoEmployees returns an array of valid employees', () => {
    const employees = generateDemoEmployees() as Employee[];
    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBeGreaterThan(0);
    for (const employee of employees) {
      expect(employee.name).toBeTruthy();
      expect(employee.role).toBeTruthy();
      expect(Array.isArray(employee.skills)).toBe(true);
      expect(employee.status).toMatch(/active|away/);
    }
  });
});
