import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

const client = createConvexClient();
const tracks = await client.query(api.tracks.getTrackSnapshot, {
  projectSlug: 'kanban-conductor',
  trackId: 'mobile_responsive_20260502',
});

console.log('Track:', tracks);
