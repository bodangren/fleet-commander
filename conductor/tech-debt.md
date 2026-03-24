# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or summarize resolved items when they no longer need to influence near-term planning.
>
> **Severity:** `Critical` | `High` | `Medium` | `Low`
> **Status:** `Open` | `Resolved`

| Date       | Track                       | Item                                                  | Severity | Status | Notes                                                                              |
| ---------- | --------------------------- | ----------------------------------------------------- | -------- | ------ | ---------------------------------------------------------------------------------- |
| 2026-03-25 | cli_process_manager         | main.go imported `fleet-commanderater` (typo) vs correct module name | High     | Resolved | Fixed import path to `fleet-commander`                                                |
| 2026-03-25 | cli_process_manager         | ExecuteTask call missing descriptionPrompt/specContent params | High     | Resolved | Added empty strings as placeholder; task model lacks these fields                   |
| 2026-03-24 | daily_refactor              | PostCSS config ES module compatibility               | Low      | Resolved | Converted postcss.config.js from CommonJS to ES module                              |
