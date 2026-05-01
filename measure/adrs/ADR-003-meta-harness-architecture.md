# ADR-003: Meta-Harness Architecture (opencode)

## Status
Accepted (2026-04-02)

## Context
Fleet Commander supports multiple AI agent CLI tools (gemini-cli, claude code, aider, opencode). Early designs considered:
1. **Per-tool harness**: Custom adapter for each CLI tool
2. **Meta-harness**: Single unified harness that abstracts all tools

## Decision
Adopt a meta-harness architecture using opencode as the primary unified interface.

## Rationale
1. **Syntax Unification**: All ~100 LLM models speak the same prompt syntax through opencode
2. **Simplified Switching**: Change models by updating config, not harness code
3. **Reduced Maintenance**: One harness to maintain instead of N adapters
4. **Capability Schema**: Single harness capability YAML schema works across all models
5. **Future-Proof**: New models automatically supported without harness changes

## Architecture

```
Fleet Commander
    └── Harness Profile (YAML)
            └── opencode meta-harness
                    ├── gemini-cli (Gemini models)
                    ├── claude code (Claude models)
                    ├── aider (OpenAI/Anthropic)
                    └── ... (any prompt-accepting CLI)
```

The meta-harness:
- Accepts a unified prompt format
- Translates to tool-specific CLI invocations
- Normalizes outputs across different tools
- Handles tool-specific quirks (auth, flags, output format)

## Consequences
- Harness profiles in `convex/harnessProfiles.ts` use unified schema
- Agent registry configures tool selection via profile, not hardcoded harness
- `pivot/src/harness/` contains meta-harness implementation
- New tools added by extending meta-harness, not creating new harnesses
- Tool-specific optimizations still possible via profile configuration

## Notes
- Meta-harness does not replace tool-specific features (e.g., Claude's artifacts)
- Profiles can specify tool-specific flags and environment variables
- Fallback chain: if opencode fails, can retry with direct tool invocation
