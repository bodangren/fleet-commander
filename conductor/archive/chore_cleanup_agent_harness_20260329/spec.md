# Specification - Cleanup Agent/Harness Integration

## Overview

Refactor the agent and harness execution system to remove duplication, simplify the resolution path, and improve error visibility. The current implementation has redundant agent definitions, convoluted fallback logic, and silent failures that make debugging difficult.

## Problem Statement

The orchestrator-harness integration was hastily implemented and has several issues:

1. **Duplicate bundled files**: Agent definitions exist in both `defaults/agents/` and `defaults/` directories
2. **Hardcoded mock agents**: `LoadDefaultAgentConfigs()` still creates fake gemini/claude agents that override real resolution
3. **Complex resolution chain**: Three-tier fallback makes it unclear which agent config actually executes
4. **Poor initialization**: Resolver created with nil stores, requiring separate SetResolver() call
5. **Silent failures**: Missing harnesses fall back to `echo` without any indication to the user
6. **No validation**: Agent model format (`harness/model`) not validated until resolution time

## Scope

### In Scope

- Remove duplicate agent definition files
- Remove hardcoded `LoadDefaultAgentConfigs()` and `agentConfigs` map from ExecutionService
- Simplify `resolveCommand()` to single-path: use resolver or return clear error
- Change `NewExecutionService()` to accept stores directly for resolver construction
- Add harness binary availability check with user-visible error
- Add agent model format validation at load time

### Out of Scope

- Adding new harnesses beyond OpenCode
- Changing the agent definition file format
- Modifying the orchestrator task selection logic
- UI changes for error display (API errors only)

## Acceptance Criteria

- [ ] Only one copy of bundled agent files exists (in `defaults/agents/`)
- [ ] `ExecutionService` has no `agentConfigs` map and no `LoadDefaultAgentConfigs()` method
- [ ] `resolveCommand()` returns clear error when agent/harness cannot be resolved
- [ ] `NewExecutionService()` accepts `*agents.Store` and `*harness.Store` parameters
- [ ] When harness binary not found, execution returns error instead of falling back to echo
- [ ] Agents with invalid model format (missing `/`) are rejected at store load time
- [ ] All existing tests updated and passing
- [ ] Go build succeeds; test coverage >80%
