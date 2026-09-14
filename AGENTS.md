# Workspace Instructions & Agent Guidelines

This workspace is configured for ideation, market research, business model stress-testing, and rapid prototyping using Matt Pocock's skills.

## Agent skills

### Issue tracker

Local markdown issue tracker under `.scratch/<idea-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical 5-role triage label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

---

## Available Skills & Workflow Playbook

The workspace includes 37 skills located in `.agents/skills/`. Key workflows:

1. **Ideation & Grilling**:
   - `/grill-me`: Relentlessly stress-test any business idea, assumption, or plan.
   - `/grill-with-docs`: Grilling session that also extracts and updates `CONTEXT.md` and ADRs.
   - `/ask-matt`: Determine which skill or workflow best fits a given scenario.

2. **Specification & Task Breakdown**:
   - `/to-spec`: Synthesizes the conversation into a clear specification under `.scratch/<slug>/spec.md`.
   - `/to-tickets`: Breaks down a specification into actionable tracer-bullet tickets under `.scratch/<slug>/issues/`.
   - `/wayfinder`: Maps out large complex efforts into decision tickets.

3. **Validation & Execution**:
   - `/research`: In-depth investigation against primary sources captured as Markdown reports.
   - `/prototype`: Build throwaway HTML/interactive prototypes to validate user flows or state logic.
   - `/tdd`: Test-driven development for any code implementation.
   - `/code-review`: Two-axis code review (Standards + Spec fidelity).
