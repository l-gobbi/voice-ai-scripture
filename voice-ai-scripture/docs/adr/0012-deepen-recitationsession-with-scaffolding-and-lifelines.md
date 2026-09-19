# 0012: Deepen RecitationSession with 3-Tier Scaffolding, Lifelines, and Audio Locality

## Context
ADR 0011 established the three-tier scaffolded learning progression (Echo Mode -> Cloze Practice -> Blind Recitation) and the dual-tier speech architecture. However, its initial implementation concentrated session orchestration imperatively inside ReviewScreen.tsx. The screen component exceeded 465 lines, managing active tier state, cloze masking algorithms, word-peek 3-second auto-hide timers (peekTimersRef), speech synthesis triggers, and business policies (e.g. { unmetered: true } vs { unmetered: false, assistanceUsed }).

Meanwhile, RecitationSession.ts remained a shallow single-attempt runner, leaking domain policies and orchestration rules to the UI layer. This resulted in:
1. Low module depth: RecitationSession had high interface surface relative to its narrow internal behavior.
2. Poor locality: Scaffolding invariants and assistance score caps were split between UI button handlers and the session.
3. Timer leak risks: UI-managed setTimeout handles risked leaking when components unmounted during active lifelines.
4. Testing friction: Verifying the multi-tier learning journey required rendering React Native component trees.

## Decision
We decided to deepen RecitationSession into the core domain module owning the entire learning lifecycle:

1. **Scaffolding Lifecycle & Tier Progression**:
   - RecitationSession owns level: 1 | 2 | 3, cloze token generation, and tier transitions (setLevel(level), nextLevel(), practiceAgain()).
   - Cloze token masking is maintained internally for each tier ('first-letter' for Level 2, 'blank' for Level 3).

2. **Lifeline Invariants & Encapsulated Timers**:
   - The module encapsulates the 3-second auto-conceal countdown timer for Level 3 word peeking.
   - tapWord(index) automatically applies tier-appropriate behavior: permanent reveal for Level 2; 3-second temporary peek with score-capping flag (assistanceUsed: true) for Level 3.
   - Text reveal in Level 1 is controlled via toggleTextReveal().

3. **Speech Synthesis Seam & Audio Locality**:
   - An injectable SpeechSynthesizer seam is accepted in the session options (defaulting to the system adapter).
   - The session provides vocalize() and supports automatic ear-training vocalization on Level 1 entry (autoVocalizeOnLevel1: boolean, default true).
   - Active speech synthesis is automatically halted before microphone recording begins.

4. **Policy Encapsulation**:
   - startReciting() and stopAndVerify() take zero policy flags.
   - Levels 1 & 2 are automatically unmetered practice attempts (simulating SRS, zero quota consumption, zero persistence mutations).
   - Level 3 is automatically the official attempt (enforcing subscription quota, capping score at 75% if lifelines were used, and committing review to VerseEngine).

5. **Consolidated State & Clean Teardown**:
   - RecitationState exposes level, status, clozeTokens, isTextRevealed, assistanceUsed, currentResult, officialResult, volumeLevel, and errorMessage.
   - An explicit dispose() method tears down active timers, cancels speech synthesis, deletes orphaned audio recordings, and detaches all listeners.

## Consequences
- ReviewScreen.tsx collapses from 465 lines of imperative state logic down to a declarative view under 180 lines.
- Complete multi-tier recitation journeys, word peeks, and scoring invariants can be verified headlessly in fast unit tests without mounting React components.
- Timer leaks are eliminated because useRecitationSession invokes dispose() on unmount.
