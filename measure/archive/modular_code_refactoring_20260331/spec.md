# Specification - Modular Code Refactoring

## Overview

Refactor the largest source files in the codebase into smaller, focused modules. This addresses technical debt where files have grown beyond reasonable size thresholds, making them difficult to navigate, test, and maintain.

## Problem Statement

Several source files exceed 400+ lines, mixing multiple concerns:
1. **main.go (668 lines)** - Route registration, config, multiple API handlers
2. **AgentEditorPage.tsx (726 lines)** - Form state, validation, API calls, UI
3. **ProjectViewPage.tsx (560 lines)** - Multiple view modes, modals, state
4. **HarnessEditorPage.tsx (502 lines)** - Similar to AgentEditor
5. **api_management.go (498 lines)** - Multiple unrelated API handlers
6. **internal/orchestrator/run.go (416 lines)** - Execution + logging + broadcasting

Large files increase cognitive load, make testing harder, and slow down code reviews.

## Scope

### In Scope

- Extract route handlers from `main.go` into dedicated files
- Extract reusable hooks/components from page components
- Split `api_management.go` into domain-specific files
- Extract concerns from `orchestrator/run.go` (broadcasting, issue creation)
- Maintain all existing functionality and tests
- Update imports across codebase

### Out of Scope

- Changing any external behavior or API contracts
- Adding new features
- Refactoring files under 400 lines
- Renaming exported symbols

## Acceptance Criteria

- [ ] No source file exceeds 400 lines (excluding tests)
- [ ] Each file has a single, clear responsibility
- [ ] All existing tests pass
- [ ] `go build ./...` succeeds
- [ ] `npm run build` (frontend) succeeds
