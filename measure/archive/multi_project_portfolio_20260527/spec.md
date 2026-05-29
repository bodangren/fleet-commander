# Spec: Multi-Project Portfolio View

## Problem
Fleet Commander shows one project at a time. Users running multiple projects have no fleet-wide health overview.

## Solution
A portfolio dashboard showing all projects in a grid/list with health indicators, latest sprint status, total spend, and quick actions.

## Acceptance Criteria
- [ ] New "Portfolio" route at `/portfolio`
- [ ] Grid of project cards: name, last sprint status, total sprints, total spend, health color
- [ ] Health rules: 🟢 last sprint completed within budget, 🟡 over budget or rejections >20%, 🔴 last sprint failed or no sprints in 7 days
- [ ] Filter by health, search by name
- [ ] Click card → project dashboard
- [ ] Quick action: "Start New Sprint" from portfolio view

## Out of Scope
- Cross-project resource allocation
- Portfolio-level budgets
- External project imports
