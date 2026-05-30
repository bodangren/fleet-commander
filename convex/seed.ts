import { mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Demo data generation for projects, tasks, and employees for virtual software house demonstration
 * @returns {Object} Demo project object with name, description, status, and timestamps
 */
export function generateDemoProject() {
  return {
    name: 'Demo Project',
    description: 'A virtual software house demo project',
    status: 'active' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Helper returning array of 6 demo tasks in various statuses for a given projectId
 * @param _projectId - The project ID (unused, demo tasks use 'demo-project')
 * @returns {Object[]} Array of 6 demo task objects with different statuses
 */
export function generateDemoTasks(_projectId: string) {
  const now = Date.now();
  return [
    {
      title: 'Set up project repository',
      description: 'Initialize the git repository and add base files',
      status: 'done' as const,
      priority: 'high' as const,
      projectId: 'demo-project',
      createdAt: now,
      updatedAt: now,
    },
    {
      title: 'Design database schema',
      description: 'Create the initial database schema for the project',
      status: 'done' as const,
      priority: 'high' as const,
      projectId: 'demo-project',
      createdAt: now,
      updatedAt: now,
    },
    {
      title: 'Implement user authentication',
      description: 'Add user login and session management',
      status: 'review' as const,
      priority: 'high' as const,
      projectId: 'demo-project',
      createdAt: now,
      updatedAt: now,
    },
    {
      title: 'Build REST API endpoints',
      description: 'Create CRUD endpoints for resources',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      projectId: 'demo-project',
      createdAt: now,
      updatedAt: now,
    },
    {
      title: 'Write unit tests',
      description: 'Add test coverage for core modules',
      status: 'ready' as const,
      priority: 'medium' as const,
      projectId: 'demo-project',
      createdAt: now,
      updatedAt: now,
    },
    {
      title: 'Set up CI/CD pipeline',
      description: 'Configure automated testing and deployment',
      status: 'backlog' as const,
      priority: 'low' as const,
      projectId: 'demo-project',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Generates sample employee data for demo projects
 * @returns {Object[]} Array of 4 demo employee objects with roles, skills, and status
 */
export function generateDemoEmployees() {
  const now = Date.now();
  return [
    {
      name: 'Alice Chen',
      role: 'Senior Developer',
      skills: ['typescript', 'react', 'node.js', 'postgresql'],
      model: 'gpt-4',
      status: 'active' as const,
      createdAt: now,
    },
    {
      name: 'Bob Martinez',
      role: 'Full Stack Engineer',
      skills: ['python', 'django', 'react', 'docker'],
      model: 'gpt-4',
      status: 'active' as const,
      createdAt: now,
    },
    {
      name: 'Carol Wu',
      role: 'DevOps Engineer',
      skills: ['kubernetes', 'terraform', 'aws', 'docker'],
      model: 'gpt-4',
      status: 'away' as const,
      createdAt: now,
    },
    {
      name: 'David Kim',
      role: 'Backend Developer',
      skills: ['golang', 'postgresql', 'redis', 'microservices'],
      model: 'gpt-4',
      status: 'active' as const,
      createdAt: now,
    },
  ];
}

export const seedDemoData = mutation({
  args: {},
  returns: v.null(),
  handler: async (_ctx) => {
    return null;
  },
});