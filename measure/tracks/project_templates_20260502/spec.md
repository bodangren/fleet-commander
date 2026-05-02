# Project Templates

## Overview

Pre-built project scaffolding templates that enable one-click project creation with measure/ structure, sample tracks, agent configs, and harness definitions. Support custom template creation from existing projects.

## Functional Requirements

1. **Template Data Model**
   - Templates stored as directories under `templates/` with manifest file
   - Manifest format: name, description, language, tags, variables, file list
   - Variables: template placeholders (e.g., `{{PROJECT_NAME}}`, `{{AUTHOR}}`)
   - Built-in templates: React App, Node API, Python CLI, Bun Library

2. **Template Instantiation**
   - Copy template directory to target project location
   - Variable substitution: replace placeholders in all text files
   - Preserve file permissions and directory structure
   - Initialize git repo, create initial commit
   - Run post-creation hooks (install deps, init measure/)

3. **Custom Template Creation**
   - Export existing project as template (strip secrets, generalize paths)
   - Prompt for variable selection from hardcoded values
   - Validate template: check manifest, verify all variables used

4. **Dashboard UI**
   - Template browser: grid of cards with name, description, language badge
   - Create-from-template flow: select template → fill variables → create
   - Preview: show file tree before creation
   - Custom template export action from project settings

## Data Sources

- `templates/` directory — template packages with manifest.json
- `projects` — source for custom template export

## Acceptance Criteria

- [ ] At least 4 built-in templates available
- [ ] One-click creation produces valid project with measure/ scaffolding
- [ ] Variable substitution applied to all text files in template
- [ ] Custom template export from existing project works
- [ ] Template browser UI with search and language filters
- [ ] Post-creation hooks execute (bun install, measure init)
- [ ] Templates versioned (v1, v2) for future updates

## Out of Scope

- Template marketplace / sharing between users
- Template versioning with automatic migration
- Template testing/validation framework
- Git-based template sources (remote repos)
