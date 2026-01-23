# Implementation Plan - LLM Agent Selection & Execution

## Phase 1: UI for Agent Selection & Tag Persistence [checkpoint: 318c3b8]
Implement the dropdown selection and ensure `@agent` tags are correctly read from and written to `plan.md`.

- [x] Task: Extend plan parsing to detect `@agent` tags in task titles 859e949
    - [x] Write unit tests for parsing task lines with and without `@agent` tags
    - [x] Update parsing logic to extract agent tags into the task data structure
- [x] Task: Implement Agent Selection Dropdown in PlanDetailPanel 32a2492
    - [x] Write UI tests for the agent dropdown (populating from settings, selecting an agent)
    - [x] Add the dropdown component and hook it up to the existing AgentTemplates store
- [x] Task: Persist agent selection as `@agent` tags in plan.md 32a2492
    - [x] Write tests for updating task lines with new/changed agent tags
    - [x] Update the plan saving logic to include the selected agent tag in the markdown output
- [x] Task: Conductor - User Manual Verification 'Phase 1: UI for Agent Selection & Tag Persistence' (Protocol in workflow.md)

## Phase 2: Context Injection & Command Execution [checkpoint: 37799cc]
Implement the logic to replace placeholders and launch the terminal with the agent's command.

- [x] Task: Implement placeholder replacement logic for `{{task}}` 351c76a
    - [x] Write unit tests for command string template replacement
    - [x] Implement the replacement function, including gathering sub-task context
- [x] Task: Create IPC handler for "Launch Agent in Terminal" 789484a
    - [x] Write tests for the new IPC handler (ensuring it calls TerminalSessionManager with the correct command)
    - [x] Implement the main-process handler that spawns a PTY and immediately writes the agent command
- [x] Task: Add "Run" button and trigger execution 4e129dd
    - [x] Write UI tests for the "Run" button visibility and click behavior
    - [x] Implement the Run button and its call to the new IPC handler
- [x] Task: Fix {{task}} replacement when placeholder is wrapped in single quotes aa947d5
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Context Injection & Command Execution' (Protocol in workflow.md)

## Phase 3: Final Integration & UX [checkpoint: 0d167a3]
Refine the interaction and ensure smooth terminal integration.

- [x] Task: Focus terminal panel and tab on launch 4e129dd
    - [x] Write tests for UI focus behavior upon launching an agent
    - [x] Implement automatic panel switching/focusing when a task is run
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Integration & UX' (Protocol in workflow.md)
