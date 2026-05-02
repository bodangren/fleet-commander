# Project Templates — Implementation Plan

## Phase 1: Template Data Model

- [ ] Define `manifest.json` schema: name, description, language, tags, variables, hooks
- [ ] Create `templates/` directory with built-in templates: react-app, node-api, python-cli, bun-library
- [ ] Populate each template with measure/ scaffolding, sample tracks, agent configs
- [ ] Add placeholder variables to template files (`{{PROJECT_NAME}}`, `{{AUTHOR}}`, etc.)
- [ ] Implement template validation: parse manifest, verify all referenced files exist
- [ ] Write unit tests for manifest parsing and validation

## Phase 2: Template Instantiation

- [ ] Implement `instantiateTemplate` function: copy template directory to target
- [ ] Variable substitution engine: scan text files, replace `{{VAR}}` placeholders
- [ ] Handle binary files: copy without substitution
- [ ] Preserve file permissions and directory structure on copy
- [ ] Git init + initial commit in target directory
- [ ] Post-creation hooks: execute commands defined in manifest (bun install, etc.)
- [ ] Error handling: rollback on failure (delete partial directory)
- [ ] Write tests for variable substitution and hook execution

## Phase 3: Dashboard UI and Custom Templates

- [ ] Build `TemplateBrowser` component: card grid with language badges and search
- [ ] Build `CreateFromTemplate` flow: template selection → variable form → create button
- [ ] File tree preview component showing template structure before creation
- [ ] Implement `exportAsTemplate` function: generalize project for template use
- [ ] Strip secrets/credentials, replace hardcoded paths with variables
- [ ] Custom template UI: select variables to parameterize, preview manifest
- [ ] Integration tests: full create-from-template flow in browser
