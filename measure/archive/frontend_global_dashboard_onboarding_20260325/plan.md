# Implementation Plan - Frontend - Global Dashboard & Onboarding

## Phase 1: Core Layout & Navigation
- [x] Task: Set up `react-router-dom` in the Vite frontend.
- [x] Task: Create a base `Layout` component featuring a collapsible sidebar.
- [x] Task: Implement a "Projects List" section in the sidebar that fetches registered projects from `GET /api/projects`.

## Phase 2: Onboarding Flow (Empty State)
- [x] Task: Create a `WelcomeScreen` component that displays when the registered projects list is empty.
- [x] Task: Build a `WorkspaceScanner` modal using Shadcn UI.
- [x] Task: Implement the UI to input a "Workspace Root" path and trigger the `POST /api/projects/scan` endpoint.
- [x] Task: Render a checklist of discovered projects returned by the scanner, allowing the user to select which ones to import.
- [x] Task: Submit the selected projects to `POST /api/projects` and redirect to the Global Dashboard upon success.

## Phase 3: Global Dashboard (Home View)
- [x] Task: Create a `Dashboard` component (the root route `/`).
- [x] Task: Implement a "Metrics Row" displaying high-level stats (e.g., Total Projects).
- [x] Task: Build a `ProjectCard` Shadcn component to display summary info for a single registered project.
- [x] Task: Render a grid of `ProjectCard`s based on the fetched projects data, with links navigating to the specific Project Detail view.
