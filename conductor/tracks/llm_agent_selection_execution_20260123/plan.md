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

## Phase 2: Context Injection & Command Execution
Implement the logic to replace placeholders and launch the terminal with the agent's command.

- [x] Task: Implement placeholder replacement logic for `{{task}}` 351c76a
    - [x] Write unit tests for command string template replacement
    - [x] Implement the replacement function, including gathering sub-task context
- [ ] Task: Create IPC handler for "Launch Agent in Terminal"
    - [ ] Write tests for the new IPC handler (ensuring it calls TerminalSessionManager with the correct command)
    - [ ] Implement the main-process handler that spawns a PTY and immediately writes the agent command
- [ ] Task: Add "Run" button and trigger execution
    - [ ] Write UI tests for the "Run" button visibility and click behavior
    - [ ] Implement the Run button and its call to the new IPC handler
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Context Injection & Command Execution' (Protocol in workflow.md)

## Phase 3: Final Integration & UX
Refine the interaction and ensure smooth terminal integration.

- [ ] Task: Focus terminal panel and tab on launch
    - [ ] Write tests for UI focus behavior upon launching an agent
    - [ ] Implement automatic panel switching/focusing when a task is run
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Integration & UX' (Protocol in workflow.md)
