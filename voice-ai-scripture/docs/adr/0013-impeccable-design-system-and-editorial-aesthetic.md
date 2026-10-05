# 0013. Impeccable Design System and Contemplative Editorial Aesthetic

## Context and Problem Statement

The application interface previously relied on scattered inline styles and hardcoded hex values in React Native components without a centralized design token system. This created visual noise, inconsistent spacing, and risked generic "AI slop" patterns. Furthermore, a devotional scripture memorization application requires a tranquil, reverent reading environment rather than an over-cluttered dashboard.

We evaluated adopting the [Impeccable](https://impeccable.style/) design framework alongside our existing mobile Expo / React Native architecture.

## Decision

We decided to:
1. **Local Installation with On-Demand Skills**: Install Impeccable at the project level for both Antigravity and Claude Code harnesses without automated web hooks (`npx impeccable install --project --providers=antigravity,claude --no-hooks -y`), keeping skills (`/polish`, `/typeset`, `/critique`, `/clarify`, etc.) available on demand without web-DOM linter noise on mobile code.
2. **Context Separation**:
   - `CONTEXT.md`: Strictly maintained as the domain terminology and business logic glossary.
   - `PRODUCT.md`: Dedicated to user persona (Christians seeking deep scripture memorization), mobile constraints, and product goals.
   - `DESIGN.md`: Dedicated to design tokens, visual guidelines, component patterns, and aesthetic principles.
3. **Reverent Editorial Aesthetic**:
   - **Typography**: Utilize zero-overhead system serifs (`Georgia` on iOS, `serif` on Android) for scripture passages to evoke the gravitas and readability of printed biblical texts, while using clean system sans-serif for UI chrome.
   - **Theming**: Centralize semantic design tokens in `src/theme/tokens.ts` supporting dual themes:
     - **Parchment (Light)**: Warm off-white backgrounds (`#FAF8F5`), soft borders, and deep charcoal ink text (`#1C1917`).
     - **Sanctuary (Dark)**: Deep quiet charcoal (`#121214`), dark parchment surfaces (`#1A1A1E`), and muted ivory text (`#F5F5F4`) for late-night or morning quiet times.
4. **Editorial Surface Layout for `ReviewScreen`**:
   - The scripture passage is presented as an uninterrupted central reading plane.
   - Interactive recitation controls (microphone, audio playback, word peek lifeline) are anchored in a clean bottom floating action bar.
   - Scaffolding indicators and diff results render with calm, non-punitive visual cues.
5. **Execution Order**:
   - Phase 1: Installation, documentation (`PRODUCT.md`, `DESIGN.md`), and typed design tokens (`src/theme/tokens.ts`).
   - Phase 2: Overhaul and polish of `ReviewScreen` with the new editorial surface and bottom-docked controls.
   - Phase 3: Rollout across `HomeScreen` and secondary modals.
