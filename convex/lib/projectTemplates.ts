/**
 * Pure-function module for the Project Template Marketplace.
 *
 * These functions are intentionally side-effect-free so they can be:
 *   1. Unit-tested without Convex context (Phase 1).
 *   2. Called from Convex mutations without leaking transactional logic (Phase 2).
 */

export type ProjectTemplatePriority = 'low' | 'medium' | 'high';

export type ProjectTemplateTaskStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'blocked';

export type ProjectTemplateAgentRole =
  | 'architect'
  | 'executor'
  | 'reviewer'
  | 'merger';

export interface ProjectTemplateTask {
  title: string;
  storyPoints: number;
  priority: ProjectTemplatePriority;
  status: ProjectTemplateTaskStatus;
  dependencies?: string[];
}

export interface ProjectTemplateAgent {
  role: ProjectTemplateAgentRole;
  model: string;
  skills: string[];
  costPerPoint: number;
}

export interface ProjectTemplate {
  name: string;
  description: string;
  category: string;
  tasks: ProjectTemplateTask[];
  defaultAgents: ProjectTemplateAgent[];
  estimatedBudget: number;
}

export interface InstantiatedProject {
  project: {
    name: string;
    description: string;
    slug?: string;
  };
  tasks: ProjectTemplateTask[];
  recommendedBudget: number;
}

export interface SourceProject {
  name: string;
  description: string;
  slug?: string;
}

export interface SourceTask {
  title: string;
  description?: string;
  storyPoints: number;
  priority: ProjectTemplatePriority;
  status: ProjectTemplateTaskStatus;
  costEstimate?: number;
  actualCost?: number;
  assigneeId?: string;
  reviewerId?: string;
  mergerId?: string;
  sessionId?: string;
  blockerReason?: string;
  rejectionReason?: string;
  dependencies?: string[];
}

export interface SourceAgent {
  name: string;
  role: ProjectTemplateAgentRole;
  model: string;
  skills: string[];
  costPerPoint: number;
}

export interface ExtractTemplateMetadata {
  category: string;
  description?: string;
  templateName?: string;
}

/**
 * Create a project + task list from a template, ready for Convex persistence.
 * @param template - Source ProjectTemplate definition
 * @param projectName - Name for the newly instantiated project
 * @returns Instantiated project struct, mapped tasks, and recommended budget
 */
export function instantiateProjectFromTemplate(
  template: ProjectTemplate,
  projectName: string,
): InstantiatedProject {
  const tasks: ProjectTemplateTask[] = template.tasks.map((t) => ({
    title: t.title,
    storyPoints: t.storyPoints,
    priority: t.priority,
    status: t.status,
    ...(t.dependencies ? { dependencies: [...t.dependencies] } : {}),
  }));

  return {
    project: {
      name: projectName,
      description: template.description,
    },
    tasks,
    recommendedBudget: recommendBudget(template),
  };
}

/**
 * Derive a reusable ProjectTemplate from an existing project, stripping
 * runtime fields and anonymizing agents.
 * @param project - Source project document (subset)
 * @param tasks - Tasks belonging to the project
 * @param agents - Agents associated with the project
 * @param metadata - Required template metadata (category) + optional overrides
 * @returns ProjectTemplate ready to be saved via createProjectTemplate
 */
export function extractTemplateFromProject(
  project: SourceProject,
  tasks: SourceTask[],
  agents: SourceAgent[],
  metadata: ExtractTemplateMetadata,
): ProjectTemplate {
  const templateTasks: ProjectTemplateTask[] = tasks.map((t) => ({
    title: t.title,
    storyPoints: t.storyPoints,
    priority: t.priority,
    status: t.status,
    ...(t.dependencies ? { dependencies: [...t.dependencies] } : {}),
  }));

  const defaultAgents: ProjectTemplateAgent[] = agents.map((a) => ({
    role: a.role,
    model: a.model,
    skills: [...a.skills],
    costPerPoint: a.costPerPoint,
  }));

  const template: ProjectTemplate = {
    name: metadata.templateName ?? project.name,
    description: metadata.description ?? project.description,
    category: metadata.category,
    tasks: templateTasks,
    defaultAgents,
    estimatedBudget: 0,
  };

  template.estimatedBudget = recommendBudget(template);

  return template;
}

/**
 * Sum task story points × average agent cost/point to recommend a budget.
 * @param template - Template with tasks[] and defaultAgents[]
 * @returns Recommended budget in USD, rounded to two decimal places
 */
export function recommendBudget(
  template: Pick<ProjectTemplate, 'tasks' | 'defaultAgents'>,
): number {
  if (template.defaultAgents.length === 0 || template.tasks.length === 0) {
    return 0;
  }

  const totalPoints = template.tasks.reduce((sum, t) => sum + t.storyPoints, 0);
  const avgCostPerPoint =
    template.defaultAgents.reduce((sum, a) => sum + a.costPerPoint, 0) /
    template.defaultAgents.length;

  return Math.round(totalPoints * avgCostPerPoint * 100) / 100;
}
