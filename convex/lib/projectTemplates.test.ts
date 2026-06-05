import { describe, expect, it } from 'bun:test';
import {
  instantiateProjectFromTemplate,
  extractTemplateFromProject,
  recommendBudget,
  type ProjectTemplate,
  type ProjectTemplateAgent,
  type ProjectTemplateTask,
  type SourceAgent,
  type SourceProject,
  type SourceTask,
} from './projectTemplates';
import {
  sampleProjectTemplate,
  sampleProjectTemplateMinimal,
} from '../__fixtures__/foundation';

function makeTemplate(overrides: Partial<ProjectTemplate> = {}): ProjectTemplate {
  return {
    name: 'Test Template',
    description: 'A test template',
    category: 'Web App',
    tasks: [
      { title: 'Task A', storyPoints: 3, priority: 'medium', status: 'backlog' },
      { title: 'Task B', storyPoints: 5, priority: 'high', status: 'backlog' },
    ],
    defaultAgents: [
      { role: 'executor', model: 'claude-sonnet', skills: ['typescript'], costPerPoint: 2 },
    ],
    estimatedBudget: 16,
    ...overrides,
  };
}

function makeAgent(overrides: Partial<ProjectTemplateAgent> = {}): ProjectTemplateAgent {
  return {
    role: 'executor',
    model: 'claude-sonnet',
    skills: ['typescript'],
    costPerPoint: 2,
    ...overrides,
  };
}

function makeTask(overrides: Partial<ProjectTemplateTask> = {}): ProjectTemplateTask {
  return {
    title: 'Sample task',
    storyPoints: 3,
    priority: 'medium',
    status: 'backlog',
    ...overrides,
  };
}

function makeSourceProject(overrides: Partial<SourceProject> = {}): SourceProject {
  return {
    name: 'Live Project',
    description: 'Currently active project',
    ...overrides,
  };
}

function makeSourceTask(overrides: Partial<SourceTask> = {}): SourceTask {
  return {
    title: 'Implement auth',
    description: 'Internal notes referencing customer-x credentials',
    storyPoints: 5,
    priority: 'high',
    status: 'in_progress',
    costEstimate: 10,
    actualCost: 12.5,
    assigneeId: 'agents-1',
    reviewerId: 'agents-2',
    sessionId: 'sess-abc',
    blockerReason: 'Waiting on infra',
    rejectionReason: 'Edge case missed',
    dependencies: ['Set up Next.js'],
    ...overrides,
  };
}

function makeSourceAgent(overrides: Partial<SourceAgent> = {}): SourceAgent {
  return {
    name: 'alice',
    role: 'architect',
    model: 'claude-opus',
    skills: ['react', 'typescript', 'ui-design'],
    costPerPoint: 4.2,
    ...overrides,
  };
}

describe('recommendBudget', () => {
  it('returns sum(storyPoints) × single agent costPerPoint', () => {
    const template = makeTemplate({
      tasks: [makeTask({ storyPoints: 4 }), makeTask({ storyPoints: 6 })],
      defaultAgents: [makeAgent({ costPerPoint: 2 })],
    });
    // 10 points × $2/point = $20
    expect(recommendBudget(template)).toBeCloseTo(20, 2);
  });

  it('averages costPerPoint across multiple agents', () => {
    const template = makeTemplate({
      tasks: [makeTask({ storyPoints: 5 })],
      defaultAgents: [
        makeAgent({ costPerPoint: 1 }),
        makeAgent({ costPerPoint: 3 }),
      ],
    });
    // 5 points × avg($1, $3) = 5 × $2 = $10
    expect(recommendBudget(template)).toBeCloseTo(10, 2);
  });

  it('returns 0 when there are no default agents', () => {
    const template = makeTemplate({
      tasks: [makeTask({ storyPoints: 13 })],
      defaultAgents: [],
    });
    expect(recommendBudget(template)).toBe(0);
  });

  it('returns 0 when there are no tasks', () => {
    const template = makeTemplate({
      tasks: [],
      defaultAgents: [makeAgent({ costPerPoint: 4.2 })],
    });
    expect(recommendBudget(template)).toBe(0);
  });

  it('returns 0 when both tasks and agents are missing', () => {
    expect(recommendBudget({ tasks: [], defaultAgents: [] })).toBe(0);
  });

  it('treats missing costPerPoint as zero contribution', () => {
    const template = makeTemplate({
      tasks: [makeTask({ storyPoints: 4 })],
      defaultAgents: [
        makeAgent({ costPerPoint: 0 }),
        makeAgent({ costPerPoint: 0 }),
      ],
    });
    expect(recommendBudget(template)).toBe(0);
  });

  it('rounds to two decimal places for fractional cents', () => {
    const template = makeTemplate({
      tasks: [makeTask({ storyPoints: 7 })],
      defaultAgents: [makeAgent({ costPerPoint: 1.111 })],
    });
    // 7 × 1.111 = 7.777 → 7.78
    const result = recommendBudget(template);
    expect(result).toBeCloseTo(7.78, 2);
    // Ensure no long fractional tail
    expect(Number.isFinite(result)).toBe(true);
    expect(Math.round(result * 100) / 100).toBe(result);
  });

  it('handles fractional story points (1.5) without losing precision before rounding', () => {
    const template = makeTemplate({
      tasks: [makeTask({ storyPoints: 1.5 }), makeTask({ storyPoints: 2.5 })],
      defaultAgents: [makeAgent({ costPerPoint: 3.33 })],
    });
    // 4 × 3.33 = 13.32
    expect(recommendBudget(template)).toBeCloseTo(13.32, 2);
  });
});

describe('instantiateProjectFromTemplate', () => {
  it('builds a project with the supplied projectName', () => {
    const result = instantiateProjectFromTemplate(sampleProjectTemplate, 'My New App');
    expect(result.project.name).toBe('My New App');
  });

  it('carries the template description into the new project', () => {
    const result = instantiateProjectFromTemplate(sampleProjectTemplate, 'My New App');
    expect(result.project.description).toBe(sampleProjectTemplate.description);
  });

  it('maps every template task into the instantiated tasks array', () => {
    const result = instantiateProjectFromTemplate(sampleProjectTemplate, 'My New App');
    expect(result.tasks).toHaveLength(sampleProjectTemplate.tasks.length);
    const titles = result.tasks.map((t) => t.title);
    expect(titles).toEqual(sampleProjectTemplate.tasks.map((t) => t.title));
  });

  it('preserves storyPoints, priority, and status on each mapped task', () => {
    const result = instantiateProjectFromTemplate(sampleProjectTemplate, 'My New App');
    result.tasks.forEach((task, idx) => {
      const source = sampleProjectTemplate.tasks[idx];
      expect(task.storyPoints).toBe(source.storyPoints);
      expect(task.priority).toBe(source.priority);
      expect(task.status).toBe(source.status);
    });
  });

  it('preserves task dependencies when present', () => {
    const result = instantiateProjectFromTemplate(sampleProjectTemplate, 'My New App');
    const withDeps = result.tasks.find((t) => t.title === 'Configure database');
    expect(withDeps?.dependencies).toEqual(['Set up Next.js project']);
  });

  it('returns recommendedBudget matching recommendBudget() output for the same template', () => {
    const result = instantiateProjectFromTemplate(sampleProjectTemplate, 'My New App');
    expect(result.recommendedBudget).toBeCloseTo(recommendBudget(sampleProjectTemplate), 2);
  });

  it('handles an empty template with zero tasks and zero budget', () => {
    const result = instantiateProjectFromTemplate(sampleProjectTemplateMinimal, 'Empty Project');
    expect(result.project.name).toBe('Empty Project');
    expect(result.tasks).toEqual([]);
    expect(result.recommendedBudget).toBe(0);
  });

  it('rounds the recommendedBudget to two decimal places', () => {
    const template = makeTemplate({
      tasks: [makeTask({ storyPoints: 7 })],
      defaultAgents: [makeAgent({ costPerPoint: 1.111 })],
    });
    const result = instantiateProjectFromTemplate(template, 'Rounded App');
    expect(result.recommendedBudget).toBeCloseTo(7.78, 2);
    expect(Math.round(result.recommendedBudget * 100) / 100).toBe(result.recommendedBudget);
  });

  it('does not mutate the input template', () => {
    const snapshot = JSON.parse(JSON.stringify(sampleProjectTemplate));
    instantiateProjectFromTemplate(sampleProjectTemplate, 'My New App');
    expect(sampleProjectTemplate).toEqual(snapshot);
  });

  it('produces tasks that conform to the persistence-ready shape', () => {
    const result = instantiateProjectFromTemplate(sampleProjectTemplate, 'My New App');
    for (const task of result.tasks) {
      expect(typeof task.title).toBe('string');
      expect(typeof task.storyPoints).toBe('number');
      expect(['low', 'medium', 'high']).toContain(task.priority);
      expect(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked']).toContain(
        task.status,
      );
    }
  });
});

describe('extractTemplateFromProject', () => {
  const project = makeSourceProject({ name: 'Customer Onboarding', description: 'Internal' });
  const tasks: SourceTask[] = [
    makeSourceTask({ title: 'Implement auth', storyPoints: 5, priority: 'high', status: 'done' }),
    makeSourceTask({
      title: 'Add dashboard',
      storyPoints: 3,
      priority: 'medium',
      status: 'in_progress',
      dependencies: ['Implement auth'],
    }),
  ];
  const agents: SourceAgent[] = [
    makeSourceAgent({ name: 'alice', role: 'architect', costPerPoint: 4.2 }),
    makeSourceAgent({
      name: 'bob',
      role: 'executor',
      model: 'claude-sonnet',
      skills: ['node'],
      costPerPoint: 2.1,
    }),
  ];

  it('uses metadata.templateName when provided, else falls back to project.name', () => {
    const named = extractTemplateFromProject(project, tasks, agents, {
      category: 'Web App',
      templateName: 'Customer Onboarding Template',
    });
    expect(named.name).toBe('Customer Onboarding Template');

    const fallback = extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    expect(fallback.name).toBe(project.name);
  });

  it('sets the category from metadata', () => {
    const template = extractTemplateFromProject(project, tasks, agents, { category: 'API Service' });
    expect(template.category).toBe('API Service');
  });

  it('uses metadata.description when provided, else falls back to project.description', () => {
    const explicit = extractTemplateFromProject(project, tasks, agents, {
      category: 'Web App',
      description: 'Sanitized template description',
    });
    expect(explicit.description).toBe('Sanitized template description');

    const fallback = extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    expect(fallback.description).toBe(project.description);
  });

  it('preserves task title, storyPoints, priority, status, and dependencies', () => {
    const template = extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    expect(template.tasks).toHaveLength(2);
    expect(template.tasks[0]).toMatchObject({
      title: 'Implement auth',
      storyPoints: 5,
      priority: 'high',
      status: 'done',
    });
    expect(template.tasks[1].dependencies).toEqual(['Implement auth']);
  });

  it('strips task description, costEstimate, actualCost, assigneeId, reviewerId, sessionId, blockerReason, rejectionReason', () => {
    const template = extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    for (const task of template.tasks) {
      expect(task).not.toHaveProperty('description');
      expect(task).not.toHaveProperty('costEstimate');
      expect(task).not.toHaveProperty('actualCost');
      expect(task).not.toHaveProperty('assigneeId');
      expect(task).not.toHaveProperty('reviewerId');
      expect(task).not.toHaveProperty('mergerId');
      expect(task).not.toHaveProperty('sessionId');
      expect(task).not.toHaveProperty('blockerReason');
      expect(task).not.toHaveProperty('rejectionReason');
    }
  });

  it('does not leak PII text (e.g., customer credentials in descriptions) into the extracted template', () => {
    const piiTask = makeSourceTask({
      description: 'Internal notes referencing customer-x credentials',
    });
    const template = extractTemplateFromProject(project, [piiTask], agents, {
      category: 'Web App',
    });
    const serialized = JSON.stringify(template);
    expect(serialized).not.toContain('customer-x credentials');
  });

  it('anonymizes agents: defaultAgents have no name field', () => {
    const template = extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    expect(template.defaultAgents).toHaveLength(agents.length);
    for (const agent of template.defaultAgents) {
      expect(agent).not.toHaveProperty('name');
    }
  });

  it('agent name scrubbing: real names like "alice"/"bob" do not appear anywhere in the extracted template', () => {
    const template = extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    const serialized = JSON.stringify(template);
    expect(serialized).not.toContain('alice');
    expect(serialized).not.toContain('bob');
  });

  it('preserves agent role, model, skills, and costPerPoint', () => {
    const template = extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    expect(template.defaultAgents[0]).toMatchObject({
      role: 'architect',
      model: 'claude-opus',
      costPerPoint: 4.2,
    });
    expect(template.defaultAgents[0].skills).toEqual(['react', 'typescript', 'ui-design']);
    expect(template.defaultAgents[1]).toMatchObject({
      role: 'executor',
      model: 'claude-sonnet',
      costPerPoint: 2.1,
    });
  });

  it('populates estimatedBudget consistent with recommendBudget()', () => {
    const template = extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    const expected = recommendBudget({
      tasks: template.tasks,
      defaultAgents: template.defaultAgents,
    });
    expect(template.estimatedBudget).toBeCloseTo(expected, 2);
  });

  it('handles a minimal project with no tasks and no agents', () => {
    const template = extractTemplateFromProject(makeSourceProject(), [], [], {
      category: 'Other',
    });
    expect(template.tasks).toEqual([]);
    expect(template.defaultAgents).toEqual([]);
    expect(template.estimatedBudget).toBe(0);
  });

  it('does not mutate the input project, tasks, or agents', () => {
    const projectSnapshot = JSON.parse(JSON.stringify(project));
    const tasksSnapshot = JSON.parse(JSON.stringify(tasks));
    const agentsSnapshot = JSON.parse(JSON.stringify(agents));
    extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    expect(project).toEqual(projectSnapshot);
    expect(tasks).toEqual(tasksSnapshot);
    expect(agents).toEqual(agentsSnapshot);
  });
});

describe('extract → instantiate round-trip', () => {
  it('a template extracted from a project can be re-instantiated into a valid project shape', () => {
    const project = makeSourceProject({ name: 'Source App' });
    const tasks: SourceTask[] = [
      makeSourceTask({
        title: 'Step 1',
        storyPoints: 3,
        priority: 'medium',
        status: 'backlog',
        dependencies: undefined,
      }),
      makeSourceTask({
        title: 'Step 2',
        storyPoints: 5,
        priority: 'high',
        status: 'backlog',
        dependencies: ['Step 1'],
      }),
    ];
    const agents: SourceAgent[] = [
      makeSourceAgent({ name: 'alice', role: 'architect', costPerPoint: 4 }),
    ];

    const template = extractTemplateFromProject(project, tasks, agents, { category: 'Web App' });
    const instantiated = instantiateProjectFromTemplate(template, 'Cloned App');

    expect(instantiated.project.name).toBe('Cloned App');
    expect(instantiated.tasks).toHaveLength(tasks.length);
    expect(instantiated.tasks[1].dependencies).toEqual(['Step 1']);
    expect(instantiated.recommendedBudget).toBeCloseTo(template.estimatedBudget, 2);
  });
});
