# Specification - Fix YAML Safe Schema (TD-031)

## Overview
Replace bare `yaml.load(content)` calls with `yaml.load(content, { schema: yaml.DEFAULT_SCHEMA })` across all 6 occurrences in the codebase to eliminate arbitrary JS deserialization risk.

## Functional Requirements

- **FR1**: All `yaml.load()` calls must explicitly specify a safe schema option.
- **FR2**: Use `yaml.DEFAULT_SCHEMA` as the safe schema (consistent with tech-debt recommendation).
- **FR3**: No behavioral change to existing YAML parsing — same types supported, same output.

## Acceptance Criteria

1. All 6 `yaml.load()` call sites updated to include `{ schema: yaml.DEFAULT_SCHEMA }`.
2. Existing tests pass without modification.
3. No new runtime errors from YAML loading.

## Out of Scope

- Migrating to `yaml.load()` → `yaml.parse()` (js-yaml v4 API).
- Adding input validation beyond schema safety.
- Changing YAML schema to `FAILSAFE_SCHEMA` (more restrictive than needed).
