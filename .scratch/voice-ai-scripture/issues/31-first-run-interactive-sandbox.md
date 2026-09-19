# 31: First-Run Interactive Sandbox (Acts 2:38)

**What to build:**  
A zero-friction, zero-commitment onboarding experience for first-time users. When the application launches with an empty library (`allVerses.length === 0`), the Home Screen replaces the bare empty-state string with a prominent `SandboxWelcomeCard` featuring Acts 2:38. Tapping "Try Interactive Recitation (Acts 2:38)" immediately launches the 3-tier review screen in sandbox mode. After completing the recitation, a celebratory opt-in dialog asks the user if they want to save Acts 2:38 to their permanent daily review deck or continue exploring without saving, preventing unwanted library clutter while ensuring an instant "Aha!" moment.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] When `summary.allVerses.length === 0`, `HomeScreen` renders `SandboxWelcomeCard` instead of the standard empty text list.
- [x] `SandboxWelcomeCard` features Acts 2:38 with an inviting teaser and a prominent `🎤 Try Interactive Recitation (Acts 2:38)` action.
- [x] Acts 2:38 text supports English (WEB) and Portuguese (Almeida) based on locale or preference.
- [x] Tapping the sandbox action launches `ReviewScreen` in sandbox mode (`isSandbox: true`) with Acts 2:38 loaded ephemerally.
- [x] ReviewScreen allows testing all 3 tiers (Echo $\rightarrow$ Cloze $\rightarrow$ Recite) without consuming trial quota or altering permanent SRS data.
- [x] Completing the sandbox recitation displays an opt-in dialog: *"Add Acts 2:38 to your daily memory deck?"*.
- [x] Choosing "Add to My Verses" saves Acts 2:38 to `VerseEngine`, schedules its first review, and refreshes the Home Screen with the new verse.
- [x] Choosing "Explore App without Saving" returns the user to the Home Screen with an empty library intact.
- [x] All flows are verified with hermetic tests in `ReviewScreen.test.tsx` and `HomeScreen.test.tsx`.

