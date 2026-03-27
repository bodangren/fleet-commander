# Specification - Frontend - Global Dashboard & Onboarding

## 1. Goal
Create a unified, modern web interface (using React, Vite, Tailwind, and Shadcn) that serves as the "command center" for the local Fleet Commander daemon. It should guide new users through connecting their first project and provide a macro-level view of all registered codebases.

## 2. Architecture & Tech Stack
- **Framework:** React 18 + Vite (already scaffolded in `frontend/`).
- **Routing:** `react-router-dom` for client-side navigation between the Global Dashboard and specific Project Views.
- **Styling:** Tailwind CSS + Shadcn UI components.
- **State/Data:** Standard `fetch` requests proxying to the Go backend (`localhost:8080/api/...`).

## 3. Core User Flows
1. **First Boot (Empty State):**
   - The user loads the UI for the first time. The `projects` array returned by the API is empty.
   - The UI displays a friendly onboarding screen.
   - The user inputs a path like `/home/user/code/` and clicks "Scan".
   - The UI shows a loading state while polling or waiting for the scan to finish.
   - The UI presents checkboxes for the discovered projects, the user clicks "Import", and the dashboard populates.

2. **The Global View:**
   - A sidebar persists on the left for quick navigation.
   - The main area shows high-level stats and a grid of `ProjectCard`s.
   - Clicking a card navigates the user to `/project/:id`, where the Kanban board will eventually live.

## 4. Design Guidelines
- Use a clean, developer-focused aesthetic (dark mode by default or system preference).
- Favor clear typography and subtle animations for interactions.
- Ensure all destructive or significant actions (like removing a project from the registry) require confirmation.