import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export interface EnvironmentVariable {
  key: string;
  value: string;
  secret?: boolean;
}

export interface DeploymentRecord {
  id: string;
  version: string;
  deployer: string;
  timestamp: number;
  result: 'success' | 'failure' | 'pending';
  pipelineExecutionId?: string;
}

export interface Environment {
  name: string;
  targetUrl: string;
  deployScript?: string;
  variables: EnvironmentVariable[];
  status: 'active' | 'inactive' | 'deploying';
  lastDeploy?: DeploymentRecord;
  deployments: DeploymentRecord[];
}

export interface EnvironmentsFile {
  environments: Environment[];
}

const SCHEMA_DOC = `# Environment Configuration
# Define deployment targets with associated variables and deploy scripts.
# Environments are loaded by Fleet Commander and integrated with the pipeline runner.
`;

/**
 * Loads environments from measure/environments.yml YAML file
 * @param projectRoot - The project root directory
 * @returns Array of Environment objects
 */
export function loadEnvironments(projectRoot: string): Environment[] {
  const filePath = join(projectRoot, 'measure', 'environments.yml');
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, 'utf8');
  const parsed = yaml.load(content, { schema: yaml.DEFAULT_SCHEMA }) as EnvironmentsFile;

  if (!parsed?.environments || !Array.isArray(parsed.environments)) {
    return [];
  }

  return parsed.environments.map((env) => ({
    name: env.name ?? 'unnamed',
    targetUrl: env.targetUrl ?? '',
    deployScript: env.deployScript,
    variables: env.variables ?? [],
    status: env.status ?? 'inactive',
    lastDeploy: env.lastDeploy,
    deployments: env.deployments ?? [],
  }));
}

/**
 * Saves environments array to measure/environments.yml YAML file
 * @param projectRoot - The project root directory
 * @param environments - Array of Environment objects to save
 */
export function saveEnvironments(projectRoot: string, environments: Environment[]): void {
  const filePath = join(projectRoot, 'measure', 'environments.yml');
  const content = SCHEMA_DOC + yaml.dump({ environments }, { schema: yaml.DEFAULT_SCHEMA, lineWidth: 120 });
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Finds an environment by name in the environments array
 * @param environments - Array of Environment objects
 * @param name - The environment name to find
 * @returns The matching Environment or undefined
 */
export function findEnvironment(environments: Environment[], name: string): Environment | undefined {
  return environments.find((e) => e.name === name);
}

/**
 * Adds a deployment record to an environment and returns the record
 * @param env - The Environment to add deployment to
 * @param version - The deployment version string
 * @param deployer - The deployer identifier
 * @param pipelineExecutionId - Optional pipeline execution ID
 * @returns The created DeploymentRecord
 */
export function addDeployment(
  env: Environment,
  version: string,
  deployer: string,
  pipelineExecutionId?: string,
): DeploymentRecord {
  const record: DeploymentRecord = {
    id: `deploy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    version,
    deployer,
    timestamp: Date.now(),
    result: 'pending',
    pipelineExecutionId,
  };
  env.deployments.push(record);
  env.lastDeploy = record;
  return record;
}
