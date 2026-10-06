# 54: Bilingual Duolingo-Style Floating Microphone Button Component

**What to build:** An accessible, tactile 76x76dp circular floating button component (`FloatingMicButton`). Renders a sacred gold background with a language-agnostic microphone icon (`🎙️`) when idle. While reciting, renders an animated concentric breathing aura reacting to live volume, a square stop icon (`⏹`) for instant manual completion, and an outer circular progress arc reflecting delayed silence progress. Displays a subtle `Cancel` (en) / `Cancelar` (pt) text link below the button.

**Blocked by:** 51: Pure Voice Activity Detector Engine with Thinking Grace & Delayed Arc

**Status:** resolved

- [x] 76x76dp circular touch target centered horizontally, exceeding the 48dp accessibility guideline
- [x] Idle state renders sacred gold accent (`theme.colors.accentSacred`) with clean microphone glyph (`🎙️`)
- [x] Active reciting state renders stop glyph (`⏹`) and pulsing breathing volume aura reacting to `volumeLevel`
- [x] Outer circular arc track reflects `vadProgress` (invisible at 0, filling smoothly from 0 to 1)
- [x] Renders subtle text button `Cancel` for English and `Cancelar` for Portuguese beneath the circular button
- [x] Tapping the circular button when reciting invokes `onStop` immediately
- [x] Tapping the cancel link invokes `onCancel`
- [x] Unit tests verifying visual states, accessibility roles, and press callbacks across English and Portuguese props
