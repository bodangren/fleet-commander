# Migrate Opencode Harness to @opencode-ai/sdk

## Context & Background
Currently, Fleet Commander uses `Bun.spawn` in `pivot/src/orchestrator/executor.ts` to execute agent tasks via the `opencode` CLI. This requires stringifying commands, monitoring output streams, and scraping log output (like `parseSessionId`) to maintain state. Critically, this ephemeral process architecture creates orphaned processes if the orchestrator crashes or is killed (e.g. daily cron restarts), leaving background tasks running.

## Goals
Migrate from CLI-spawning to the `@opencode-ai/sdk` Client-Server model. We will:
1. Run a persistent OpenCode server alongside the `pivot` orchestrator.
2. Replace CLI `Bun.spawn` calls with SDK API calls (creating sessions and sending prompts).
3. Ensure process lifecycle hooks exist so the OpenCode server is gracefully terminated when the orchestrator exits.
4. Eliminate orphaned background opencode processes.
5. Standardize on the SDK's typed data interfaces instead of `stdout`/`stderr` string scraping.

## Non-Goals
- Do not decompose the ReAct loop itself; we are still relying on OpenCode to abstract the models and tools.
- Do not rewrite the UI agent configuration logic (though we might adapt how model names map if required by the SDK).
- Do not swap out Opencode for other harnesses (ADR-003 remains in effect).

## Architecture Changes
- **Server Lifecycle**: Add a startup procedure in the pivot backend to initialize `createOpencode` (or `createOpencodeClient` connected to a supervised daemon).
- **Resolver**: Adapt `resolveAgentCommand` so it yields SDK-compatible configuration (e.g., config objects with model strings) instead of shell commands and arguments.
- **Executor**: Rewrite `executeTask` in `executor.ts` to interact with `client.sessions`. Maintain budget enforcement (tokens, timeout), but rely on structured returns instead of parsing `stdout`.
