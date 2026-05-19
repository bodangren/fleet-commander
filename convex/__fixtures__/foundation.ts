/**
 * Shared test fixtures for the foundation layer.
 * Reuse across P2–P6 to avoid duplicating mock contexts and sample data.
 */

export function createMockCtx(overrides?: {
  agents?: Map<string, any>;
  tasks?: Map<string, any>;
  projects?: Map<string, any>;
  sprints?: Map<string, any>;
  pipelineRuns?: Map<string, any>;
  providers?: Map<string, any>;
  alerts?: Map<string, any>;
}) {
  const agents = overrides?.agents ?? new Map<string, any>();
  const tasks = overrides?.tasks ?? new Map<string, any>();
  const projects = overrides?.projects ?? new Map<string, any>();
  const sprints = overrides?.sprints ?? new Map<string, any>();
  const pipelineRuns = overrides?.pipelineRuns ?? new Map<string, any>();
  const providers = overrides?.providers ?? new Map<string, any>();
  const alerts = overrides?.alerts ?? new Map<string, any>();

  const tables: Record<string, Map<string, any>> = {
    agents,
    tasks,
    projects,
    sprints,
    pipelineRuns,
    providers,
    alerts,
  };

  const db = {
    query: (table: string) => ({
      order: (dir: 'asc' | 'desc') => ({
        collect: async () => {
          const map = tables[table];
          let arr = map ? Array.from(map.values()) : [];
          if (dir === 'desc') arr = arr.reverse();
          return arr;
        },
      }),
      collect: async () => {
        const map = tables[table];
        return map ? Array.from(map.values()) : [];
      },
      withIndex: (_index: string, cb?: (q: any) => any) => {
        const filters: Array<{ field: string; value: any }> = [];
        const q = {
          eq: (field: string, value: any) => {
            filters.push({ field, value });
            return q;
          },
        };
        if (cb) cb(q);
        const getFiltered = () => {
          const map = tables[table];
          if (!map) return [];
          return Array.from(map.values()).filter((doc: any) =>
            filters.every((f) => doc[f.field] === f.value)
          );
        };

        const chain = {
          order: (dir: 'asc' | 'desc') => ({
            collect: async () => {
              let arr = getFiltered();
              if (dir === 'desc') arr = arr.reverse();
              return arr;
            },
          }),
          collect: async () => getFiltered(),
          unique: async () => {
            const results = getFiltered();
            return results[0] ?? null;
          },
          filter: (filterCb: (q: any) => any) => {
            const filterQ = {
              eq: (fieldRef: any, value?: any) => {
                const fieldName = typeof fieldRef === 'string' ? fieldRef : fieldRef?._field;
                const val = value !== undefined ? value : fieldRef;
                filters.push({ field: fieldName, value: val });
                return filterQ;
              },
              field: (field: string) => ({ _field: field }),
            };
            filterCb(filterQ);
            return chain;
          },
        };
        return chain;
      },
    }),
    get: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) return map.get(id) ?? null;
      }
      return null;
    },
    insert: async (table: string, doc: any) => {
      const allSize = Object.values(tables).reduce(
        (sum, m) => sum + m.size,
        0
      );
      const id = `${table.slice(0, -1)}-${allSize + 1}`;
      const map = tables[table];
      if (map) map.set(id, { _id: id, ...doc });
      return id;
    },
    patch: async (id: string, patch: any) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) {
          const existing = map.get(id);
          map.set(id, { ...existing, ...patch });
          return;
        }
      }
    },
  };

  return { db } as any;
}

export const sampleProject = {
  name: 'Foundation Test Project',
  description: 'A minimal valid project for unit tests',
  createdAt: 1000,
  updatedAt: 1000,
};

export const sampleSprint = {
  name: 'Sprint 1',
  status: 'planned' as const,
  budget: 1000,
  actualCost: 0,
  pointsDelivered: 0,
  taskCount: 0,
  completedCount: 0,
  createdAt: 1000,
};

export const sampleTask = {
  title: 'Sample Task',
  description: 'A sample task for testing',
  storyPoints: 3,
  status: 'backlog' as const,
  priority: 'medium' as const,
  costEstimate: 10,
  createdAt: 1000,
  updatedAt: 1000,
};

export const sampleProviders = [
  {
    name: 'openai',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4o-realtime'],
    status: 'active' as const,
    latency: 120,
    createdAt: 1000,
  },
  {
    name: 'anthropic',
    models: ['claude-opus-4', 'claude-sonnet-4'],
    status: 'active' as const,
    latency: 150,
    createdAt: 2000,
  },
  {
    name: 'google',
    models: ['gemini-2.5-pro'],
    status: 'idle' as const,
    latency: 200,
    createdAt: 3000,
  },
];

export const sampleAgents = [
  {
    name: 'alice',
    role: 'architect',
    skills: ['react', 'typescript', 'ui-design'],
    model: 'claude-opus',
    costPerPoint: 4.2,
    reliability: 0.95,
    status: 'active',
    workload: 0,
    maxWorkload: 5,
    createdAt: 1000,
  },
  {
    name: 'bob',
    role: 'executor',
    skills: ['node', 'postgresql', 'api-design'],
    model: 'claude-sonnet',
    costPerPoint: 2.1,
    reliability: 0.92,
    status: 'active',
    workload: 0,
    maxWorkload: 5,
    createdAt: 2000,
  },
  {
    name: 'carol',
    role: 'reviewer',
    skills: ['testing', 'playwright', 'ci-cd'],
    model: 'gpt-4o',
    costPerPoint: 1.8,
    reliability: 0.88,
    status: 'active',
    workload: 0,
    maxWorkload: 5,
    createdAt: 3000,
  },
  {
    name: 'frank',
    role: 'executor',
    skills: ['documentation', 'technical-writing', 'markdown'],
    model: 'gemini-pro',
    costPerPoint: 1.2,
    reliability: 0.85,
    status: 'active',
    workload: 0,
    maxWorkload: 5,
    createdAt: 4000,
  },
];
