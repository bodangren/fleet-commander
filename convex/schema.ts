import { defineSchema } from 'convex/server';
import core from './schema/core';
import tasks from './schema/tasks';
import agents from './schema/agents';
import planning from './schema/planning';
import operations from './schema/operations';
import analytics from './schema/analytics';
import contracts from './schema/contracts';

export default defineSchema({
  ...core,
  ...tasks,
  ...agents,
  ...planning,
  ...operations,
  ...analytics,
  ...contracts,
});
