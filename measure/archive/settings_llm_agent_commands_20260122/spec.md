# Spec: Settings menu configures different llm agent command lines

## Overview
Add a Settings UI that lets users manage a list of named command templates for LLM agents. Each template is a single command-line string that can include everything needed to run the agent and supports a `{{task}}` placeholder for injecting a task description. These templates are stored in app settings (local to the user/machine) and will be selectable elsewhere in a future track.

## Functional Requirements
1. Provide a Settings section for “LLM Agent Command Templates”.
2. Display a list of existing templates with their name and command string.
3. Support the following actions:
   - Add a new template
   - Edit an existing template
   - Delete a template
   - Reorder templates
4. Each template has:
   - `name` (string)
   - `command` (string; full command line)
5. The command string supports `{{task}}` as the placeholder for the task description.
6. Persist templates in app settings (per-user/per-machine).
7. Validate inputs:
   - Name and command are required.
   - Command must include `{{task}}` (show error and prevent save).

## Non-Functional Requirements
1. Use existing app settings persistence mechanism.
2. UI follows existing styling conventions in the app.

## Acceptance Criteria
- User can create, edit, delete, and reorder command templates in Settings.
- Changes persist after app restart.
- Templates are stored in app settings.
- Saving is blocked with a clear validation message if required fields are missing or if `{{task}}` is absent.
- The list reflects changes immediately (add/edit/delete/reorder).

## Out of Scope
- Selecting a template in the task panel.
- Running/launching the LLM agent.
- Environment variable management as separate fields (handled within the command string).
