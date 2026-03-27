# Implementation Plan - Frontend - Global Dashboard & Onboarding

## Phase 1: Core Layout & Navigation
- [ ] Task: Set up `react-router-dom` in the Vite frontend.
- [ ] Task: Create a base `Layout` component featuring a collapsible sidebar.
- [ ] Task: Implement a "Projects List" section in the sidebar that fetches registered projects from `GET /api/projects`.

## Phase 2: Onboarding Flow (Empty State)
- [ ] Task: Create a `WelcomeScreen` component that displays when the registered projects list is empty.
- [ ] Task: Build a `WorkspaceScanner` modal using Shadcn UI.
- [ ] Task: Implement the UI to input a "Workspace Root" path and trigger the `POST /api/projects/scan` endpoint.
- [ ] Task: Render a checklist of discovered projects returned by the scanner, allowing the user to select which ones to import.
- [ ] Task: Submit the selected projects to `POST /api/projects` and redirect to the Global Dashboard upon success.

## Phase 3: Global Dashboard (Home View)
- [ ] Task: Create a `Dashboard` component (the root route `/`).
- [ ] Task: Implement a "Metrics Row" displaying high-level stats (e.g., Total Projects).
- [ ] Task: Build a `ProjectCard` Shadcn component to display summary info for a single registered project.
- [ ] Task: Render a grid of `ProjectCard`s based on the fetched projects data, with links navigating to the specific Project Detail view.