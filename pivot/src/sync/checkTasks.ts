import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

const client = createConvexClient();
const tasks = await client.query(api.fleetCatalog.listTasksByProject, {
  projectSlug: 'kanban-conductor',
});

console.log(`Found ${tasks.length} tasks`);
if (tasks.length > 0) {
  console.log('First task:', tasks[0]);
}
