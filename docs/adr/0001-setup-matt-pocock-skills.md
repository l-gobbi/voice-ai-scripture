# ADR 0001: Setup Matt Pocock Skills Environment

- **Status**: Accepted
- **Date**: 2026-09-13
- **Deciders**: Lucas Gobbi & Antigravity

## Context

We need a disciplined, composable engineering and ideation environment within the `business-ideas` workspace. The goal is to stress-test ideas rigorously ("not vibe coding"), generate actionable specifications, break work down into tracer-bullet tickets, and prototype solutions with fast feedback loops.

## Decision

We installed the complete suite of 37 skills from Matt Pocock's skills repository ([github.com/mattpocock/skills](https://github.com/mattpocock/skills)) into `.agents/skills/` using `npx skills add mattpocock/skills --copy`.

We also established the following conventions:
1. **Agent Customizations**: Located at `.agents/skills/`, automatically discovered by Antigravity.
2. **Issue Tracker**: Local Markdown tracker under `.scratch/<slug>/` using numbered issue files (`NN-<slug>.md`) and `spec.md`.
3. **Domain Vocabulary**: Documented in `CONTEXT.md` at repo root and referenced by `/domain-modeling` and `/grill-with-docs`.
4. **Decision Records**: Stored under `docs/adr/` in single-context layout.

## Consequences

- Skills can be invoked via `/skill-name` (e.g., `/grill-me`, `/ask-matt`, `/to-spec`, `/to-tickets`).
- Workflows stay lightweight and self-contained within the repo without requiring external SaaS dependencies initially.
- Can be synced with latest upstream skills via `npm run skills:update`.
