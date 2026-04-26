# Specification - LLM Agent Selection & Execution

## Overview
This track enables users to assign specific LLM agents (configured in Settings) to tasks within a Track's implementation plan and launch those agents directly into new terminal sessions with the task's context.

## Functional Requirements

### 1. Agent Selection in Plan Detail Panel
- Each task and sub-task in the Plan Detail Panel shall feature a dropdown menu to select an available LLM agent.
- Available agents are populated from the "Agent Templates" defined in the application Settings.
- Selecting an agent shall update the corresponding task line in the `plan.md` file by appending or updating an `@agent_name` tag (e.g., `- [ ] Task: My Task @gemini`).
- Removing an agent selection shall remove the `@agent_name` tag from the `plan.md`.

### 2. Task Execution
- A "Play/Run" button shall appear next to a task/sub-task only when an agent is assigned to it.
- Clicking the "Play" button shall:
    1. Resolve the agent's command template from Settings.
    2. Inject the task context into the command using placeholders:
        - `{{task}}`: Replaced with the full task title and its indented sub-tasks (if any).
    3. Launch a new terminal session in the existing Terminal Panel.
    4. Automatically execute the resolved command in that new terminal session.

### 3. Command Injection Logic
- The application must support basic string replacement for the `{{task}}` placeholder.
- The injected context should include the task name and its immediate sub-tasks to provide sufficient context for the LLM agent.

## Non-Functional Requirements
- **Persistence:** Agent assignments must be persisted directly in the `plan.md` file to ensure the source of truth remains the Markdown file.
- **UI Responsiveness:** The dropdown and run button interactions should be snappy and reflect changes in the underlying file via the existing bi-directional sync.

## Acceptance Criteria
- [ ] Users can see a list of agents in a dropdown for any task in the Plan Detail Panel.
- [ ] Selecting an agent adds an `@tag` to the task line in `plan.md`.
- [ ] Changing an agent in the UI updates the `@tag` in `plan.md`.
- [ ] Clicking "Run" opens a new terminal tab.
- [ ] The terminal tab starts by running the configured command with the task title injected.
- [ ] The command template `my-agent --prompt "{{task}}"` correctly expands to `my-agent --prompt "Implement the user login"` if the task title is "Implement the user login".

## Out of Scope
- Support for multiple agents per task.
- Automated task completion/checking after the agent finishes.
- Customizing placeholders beyond `{{task}}` in this phase.
