# Design System: Reverent Editorial Aesthetic

## Philosophy
Scripture memorization requires quiet, contemplative dignity. The interface avoids loud saturated neo-brutalist palettes, jarring gamification badges, or sterile generic dashboard patterns. Instead, it embodies the calm, printed beauty of an open Bible with timeless typography and quiet tactile warmth.

## Color Palettes & Dual Themes

### Parchment (Light Mode)
- **Background**: `#FAF8F5` (warm archival cream)
- **Surface**: `#FFFFFF` (pure white sheet)
- **Surface Muted**: `#F3EFEA` (soft parchment inset)
- **Text Primary**: `#1C1917` (deep charcoal Bible ink)
- **Text Secondary**: `#78716C` (warm muted gray)
- **Border**: `#E7E5E4` (subtle deckle border)
- **Accent Sacred**: `#D97706` (warm amber gold)

### Sanctuary (Dark Mode)
- **Background**: `#121214` (deep tranquil sanctuary night)
- **Surface**: `#1C1C20` (dark stone altar)
- **Surface Muted**: `#27272A` (muted stone)
- **Text Primary**: `#F5F5F4` (soft off-white candlelight text)
- **Text Secondary**: `#A1A1AA` (subtle gray)
- **Border**: `#2E2E33` (quiet edge)
- **Accent Sacred**: `#F59E0B` (sanctuary flame gold)

### Quiet Verification Diff Tones
- **Match**: Text `#15803D`, Background `#DCFCE7` (quiet gentle olive green)
- **Missed**: Text `#B91C1C`, Background `#FEE2E2` (unobtrusive soft brick red)
- **Added / Extra**: Text `#B45309`, Background `#FEF3C7` (soft warm amber)

## Typography Matrix
- **Biblical Scripture**: System Serif (`Georgia` on iOS, `serif` on Android).
  - Hero Passage: 22pt, line-height 34pt, weight 400.
  - Body Passage: 18pt, line-height 28pt, weight 400.
  - Cloze Mask: 18pt, line-height 28pt, weight 500.
- **UI Chrome & Meta**: System Sans (`System` on iOS, `sans-serif` on Android).
  - Heading: 20pt, line-height 26pt, weight 700.
  - Subheading: 16pt, line-height 22pt, weight 600.
  - Body: 15pt, line-height 20pt, weight 400.
  - Caption: 13pt, line-height 18pt, weight 500.
  - Badge: 11pt, line-height 14pt, weight 600, letter-spacing 0.5.

## Touch Ergonomics & Spatial Grid
- **Minimum Interactive Touch Target**: 44pt x 44pt for every button, chip, tab, and cloze word.
- **Hero Voice Trigger**: 64pt circular microphone button.
- **Rhythm**: 4pt/8pt modular spacing (`xs: 4`, `sm: 8`, `md_sm: 12`, `md: 16`, `lg: 24`, `xl: 32`, `xxl: 48`).
- **Radii**: `sm: 6`, `md: 12`, `lg: 18`, `pill: 9999`.
