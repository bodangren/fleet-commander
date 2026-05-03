# ADR-003: Opencode Exclusive Harness Architecture

## Status
Accepted (2026-05-03) - Supersedes previous meta-harness definition

## Context
Fleet Commander requires a reliable, standard interface to interact with language models. Initially, we considered building a "meta-harness" that wrapped multiple different CLI tools (like gemini-cli, claude code, aider). However, this led to unnecessary complexity, state fragmentation, and brittle parsing.

## Decision
We are pivoting to use **opencode** as the sole, exclusive CLI harness for Fleet Commander. All other CLI integrations (aider, claude code, gemini-cli) are deprecated and removed from the orchestration loop.

## Rationale
1. **Persistent Sessions:** Opencode natively supports persistent sessions via `session_id`. This is critical for multi-turn task completion. We can simply store the `session_id` in Convex and resume the session later, dramatically saving context tokens.
2. **Syntax Unification:** Opencode already abstracts ~100 LLM models behind a single, unified prompt syntax. 
3. **Reduced Maintenance:** We only maintain one adapter.
4. **Tool Reliability:** By standardizing on opencode, we can build robust execution lifecycle hooks (like `before_run`) directly around its execution model.

## Architecture

```text
Fleet Commander Orchestrator
    └── Executor
            └── Git Worktree (Isolation)
                    └── Opencode CLI (The exclusive harness)
                            └── (Any LLM chosen via config)
```

- The orchestrator dispatches tasks to an isolated Git worktree.
- It executes `opencode` within that worktree.
- Output and the resulting `session_id` are parsed and stored.
- On continuation turns, the same `session_id` is passed back to `opencode`.

## Consequences
- No more maintaining tool-specific parsers.
- The `harnessProfiles.ts` configuration is vastly simplified.
- We rely entirely on opencode's internal mechanism for model switching.