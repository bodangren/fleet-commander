# Frontend API Audit — Legacy Go → Convex Migration

## Fetch Call Inventory

All 45 fetch calls in the frontend target Go backend routes. Categorized by data slice:

### Projects (Convex-ready: `projects` table + functions exist)
| File | Method | Endpoint | Convex Function |
|------|--------|----------|-----------------|
| useFleetData.ts | POST | /api/projects/scan-and-import | N/A (filesystem op, keep Go) |
| useFleetData.ts | GET | /api/projects | projects:listProjects |
| useProjectView.ts | GET | /api/projects/:id | projects:getProjectBySlug |
| WorkspaceScanner.tsx | POST | /api/projects/scan | N/A (filesystem op, keep Go) |
| WorkspaceScanner.tsx | POST | /api/projects | projects:upsertProject |

### Agents (Convex-ready: `agents` table + fleetCatalog functions exist)
| File | Method | Endpoint | Convex Function |
|------|--------|----------|-----------------|
| useFleetData.ts | GET | /api/agents | fleetCatalog:listAgents (needs new fn) |
| useFleetData.ts | POST | /api/agents/:name/test | N/A (Go-side execution) |
| useAgentForm.ts | GET | /api/agents/:name | fleetCatalog:getAgent (needs new fn) |
| useAgentForm.ts | PUT | /api/agents/:name | fleetCatalog:upsertAgent |
| useAgentForm.ts | POST | /api/agents/:name/clone | N/A (keep Go) |
| useAgentForm.ts | POST | /api/agents/:name/test | N/A (keep Go) |
| useAgentForm.ts | POST | /api/agents/:name/reset | N/A (keep Go) |
| useAgentForm.ts | DELETE | /api/agents/:name | N/A (keep Go) |

### Harnesses (Convex-ready: `harnesses` table + functions exist)
| File | Method | Endpoint | Convex Function |
|------|--------|----------|-----------------|
| useFleetData.ts | GET | /api/harnesses | fleetCatalog:listHarnesses (needs new fn) |
| useHarnessForm.ts | GET | /api/harnesses/:name | fleetCatalog:getHarness (needs new fn) |
| useHarnessForm.ts | PUT | /api/harnesses/:name | fleetCatalog:upsertHarness |
| useHarnessForm.ts | GET | /api/harnesses/:name/models | N/A (Go-side discovery) |
| useHarnessForm.ts | POST | /api/harnesses/:name/reset | N/A (keep Go) |
| useHarnessForm.ts | DELETE | /api/harnesses/:name | N/A (keep Go) |

### Tasks (Convex-ready: `tasks` table + functions exist)
| File | Method | Endpoint | Convex Function |
|------|--------|----------|-----------------|
| useProjectView.ts | GET | /api/projects/:id/next-task | N/A (Go-side scoring) |
| useProjectView.ts | PATCH | /api/projects/:id/tasks/:taskId | fleetCatalog:upsertTask |

### Issues (Convex-ready: `issues` table + functions exist)
| File | Method | Endpoint | Convex Function |
|------|--------|----------|-----------------|
| useProjectView.ts | GET | /api/projects/:id/issues/:taskId | issues:getByProject (needs new fn) |
| IssueListView.tsx | GET | /api/projects/:id/issues | issues:listByProject (needs new fn) |
| IssueCreateModal.tsx | POST | /api/projects/:id/issues | fleetCatalog:upsertIssue |
| IssueDetailView.tsx | PUT | /api/projects/:id/issues/:issueId | fleetCatalog:upsertIssue |

### Execution Logs (Convex-ready: `executionLogs` table + functions exist)
| File | Method | Endpoint | Convex Function |
|------|--------|----------|-----------------|
| LogStatsView.tsx | GET | /api/projects/:id/logs/stats | N/A (aggregate, needs new fn) |
| LogTimelineView.tsx | GET | /api/projects/:id/logs | executionLogs:listLogsByProject |

### Settings (Convex-ready: `settings` table + functions exist)
| File | Method | Endpoint | Convex Function |
|------|--------|----------|-----------------|
| useWebSocket.ts | GET | /api/settings | settings:get (needs new fn) |
| SettingsPage.tsx | GET | /api/settings | settings:get (needs new fn) |
| SettingsPage.tsx | PUT | /api/settings | fleetCatalog:setSetting |

### Stats (NOT Convex-ready — no schema/functions)
| File | Method | Endpoint | Notes |
|------|--------|----------|-------|
| OverviewStats.tsx | GET | /api/stats/overview | Keep Go for now |
| VelocityChart.tsx | GET | /api/stats/velocity | Keep Go for now |
| AgentUtilization.tsx | GET | /api/stats/agents | Keep Go for now |
| IssueResolution.tsx | GET | /api/stats/issues | Keep Go for now |

### Sprints (NOT Convex-ready — no schema/functions)
| File | Method | Endpoint | Notes |
|------|--------|----------|-------|
| SprintPanel.tsx | GET/POST/PUT | /api/projects/:id/sprints | Keep Go for now |

### Dependencies (NOT Convex-ready — no schema/functions)
| File | Method | Endpoint | Notes |
|------|--------|----------|-------|
| DependencyGraph.tsx | GET | /api/projects/:id/dependencies | Keep Go for now |
| DependencyGraph.tsx | GET | /api/projects/:id/critical-path | Keep Go for now |

### WebSocket (Replaceable with Convex subscriptions)
| File | Method | Endpoint | Convex Approach |
|------|--------|----------|-----------------|
| useWebSocket.ts | WS | /api/projects/:id/ws | Convex useQuery subscription |

### Review (Convex-ready: partial)
| File | Method | Endpoint | Notes |
|------|--------|----------|-------|
| useTaskReview.ts | GET | /api/projects/:id/tasks/:taskId/review | Keep Go for now |

### Orchestrator (Keep Go — runtime execution)
| File | Method | Endpoint | Notes |
|------|--------|----------|-------|
| useProjectView.ts | POST | /api/projects/:id/run | Keep Go (subprocess) |

### Health (Keep Go — runtime status)
| File | Method | Endpoint | Notes |
|------|--------|----------|-------|
| useFleetData.ts | GET | /api/health | Keep Go |

## Migration Priority (This Track)

1. **Projects list** → Convex (read path first, then write)
2. **Agents list** → Convex (read path)
3. **Harnesses list** → Convex (read path)
4. **One realtime flow** → Convex subscription (project list updates)
5. **Tasks/Tracks** → Convex (read path for one additional slice)
