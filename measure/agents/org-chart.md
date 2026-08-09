# AI Company Org Chart — Agent Definitions

This directory contains agent definitions that model an AI company org chart. Each file maps a company role to a specific model, following a meticulously researched allocation that prioritizes your "unlimited" MiniMax and "large" Kimi subscriptions for high-volume tasks, while surgically deploying market-rate frontier models (DeepSeek, GLM, MiMo, Qwen) for specialized tasks.

## Org Chart

### The Free / Subsidized Labor (High Volume)
| Company role | File | Persona | Assigned model | Mode | Notes |
| --- | --- | --- | --- | --- | --- |
| **QA / test engineer** | `qa-test-engineer.md` | `@qa-test-engineer` | `minimax-cn-coding-plan/MiniMax-M2.7` | subagent | Deep reasoning for robust edge-case testing without the output tax. |
| **Junior dev** | `junior-developer.md` | `@junior-developer` | `minimax-cn-coding-plan/MiniMax-M2.7` | agent | Handles basic feature implementation and boilerplate. |
| **Intern** | `intern.md` | `@intern` | `openai/gpt-5.6-luna` | subagent | Bounded, cost-efficient work with clear step-by-step instructions. |
| **Backend lead** | `backend-lead.md` | `@backend-lead` | `kimi-for-coding/k2p7` | agent | Massive context and agent swarm architecture. Route backend work here. |
| **DevOps / SRE** | `devops-sre.md` | `@devops-sre` | `kimi-for-coding/k2p7` | agent | Terminal navigation, log parsing, and infrastructure-as-code. |

### The Market Rate Experts (High Complexity / Specialized)
| Company role | File | Persona | Assigned model | Mode | Notes |
| --- | --- | --- | --- | --- | --- |
| **CTO / principal engineer** | `cto-principal-engineer.md` | `@cto-principal-engineer` | `deepseek/deepseek-v4-pro` | agent | 1.6T MoE for ultimate logic, hard architecture, and PR approvals. |
| **Security Engineer** | `security-engineer.md` | `@security-engineer` | `deepseek/deepseek-v4-pro` | subagent | Zero-trust audits and deep vulnerability scanning. |
| **Engineering manager / PM** | `engineering-manager.md` | `@engineering-manager` | `opencode-go/glm-5.1` | subagent | Top SWE-Bench score for long-horizon planning and spec writing. |
| **Data Engineer / DBA** | `data-engineer.md` | `@data-engineer` | `opencode-go/glm-5.1` | agent | Complex schema design and SQL architecture. |
| **Frontend lead** | `frontend-lead.md` | `@frontend-lead` | `opencode-go/mimo-v2-omni` | agent | Native visual grounding for UI/UX translation. |
| **Product/marketing manager** | `product-marketing-manager.md` | `@product-marketing-manager` | `opencode-go/qwen3.5-plus` | subagent | Ultra-cheap 1M context for repo-wide docs and copywriting. |
| **Technical Writer** | `technical-writer.md` | `@technical-writer` | `opencode-go/qwen3.5-plus` | subagent | Keeps `README.md`, `ARCHITECTURE.md`, and OpenAPI specs in sync. |
| **Staff engineer / reviewer** | `staff-engineer-reviewer.md` | `@staff-engineer-reviewer` | `deepseek/deepseek-v4-pro` | subagent | Use sparingly for independent review and hard escalations. |

## Model Provider Priority

When a model is available from multiple providers, we prioritize in this order:

1. **Direct subscription endpoints** — `kimi-for-coding/*`, `minimax-cn-coding-plan/*`
2. **Local runner** — `opencode-go/*`
3. **Direct provider API** — `deepseek/*`
4. **OpenRouter / other API pricing** — `openrouter/*` (avoid when possible)

## Legacy Agents

The following older agent definitions are preserved for backward compatibility with existing tracks:

- `architect.md` → `@architect`
- `senior-frontend.md` → `@senior-frontend`
- `senior-backend.md` → `@senior-backend`
- `product-manager.md` → `@product-manager`
- `reviewer.md` → `@reviewer`
- `dispatcher.md` → `@dispatcher`
- `mid-dev.md` → `@mid-dev`
- `junior-dev.md` → `@junior-dev`

New work should prefer the org-chart personas above.
