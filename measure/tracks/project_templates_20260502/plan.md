# Project Templates — Implementation Plan

> **Symphony Compliance:** Templates must scaffold Symphony lifecycle hooks, `#tag:value` metadata in plan.md, and Postgres local backend setup.

## Phase 1: Template Data Model

- [ ] Define `manifest.json` schema: name, description, language, tags, variables, hooks, symphonyConfig
- [ ] `symphonyConfig` includes: `hooks.beforeRun`, `hooks.afterRun`, `hooks.afterCreate` template commands, `sessionPersistence: boolean`
- [ ] Create `templates/` directory with built-in templates: react-app, node-api, python-cli, bun-library
- [ ] Populate each template with measure/ scaffolding, sample tracks, agent configs, hook examples
- [ ] Add placeholder variables to template files (`{{PROJECT_NAME}}`, `{{AUTHOR}}`, etc.)
- [ ] Scaffold plan.md templates with `#tag:value` examples: `#priority:high`, `#blocked_by:task-N`, `#persona:backend`
- [ ] Implement template validation: parse manifest, verify all referenced files exist
- [ ] Write unit tests for manifest parsing and validation

## Phase 2: Template Instantiation

- [ ] Implement `instantiateTemplate` function: copy template directory to target
- [ ] Variable substitution engine: scan text files, replace `{{VAR}}` placeholders
- [ ] Handle binary files: copy without substitution
- [ ] Preserve file permissions and directory structure on copy
- [ ] Git init + initial commit in target directory
- [ ] Post-creation hooks: execute commands defined in manifest (bun install, docker compose up -d postgres)
- [ ] Error handling: rollback on failure (delete partial directory)
- [ ] Write tests for variable substitution and hook execution

## Phase 3: Dashboard UI and Custom Templates

- [ ] Build `TemplateBrowser` component: card grid with language badges and search
- [ ] Build `CreateFromTemplate` flow: template selection → variable form → create button
- [ ] File tree preview component showing template structure before creation
- [ ] Implement `exportAsTemplate` function: generalize project for template use
- [ ] Strip secrets/credentials, replace hardcoded paths with variables
- [ ] Custom template UI: select variables to parameterize, preview manifest, configure Symphony hooks
- [ ] Integration tests: full create-from-template flow in browser
