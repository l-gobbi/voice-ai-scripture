# Specification: Home Screen Retention, First-Run Sandbox, Global Daily Streak & Viral Deck Sharing

**Status:** ready-for-agent  
**Domain:** Christian EdTech / Faith-Tech / Spaced Repetition (SRS) / Habit Formation  
**Governing Documents:** `CONTEXT.md`, `docs/adr/0011-three-tier-scaffolded-recitation-and-speech-infrastructure.md`, `docs/adr/0012-deepen-recitationsession-with-scaffolding-and-lifelines.md`

---

## Problem Statement

Learners who install the application with high spiritual motivation face immediate friction that leads to high drop-off and low long-term retention:
1. **Empty First-Run Experience**: Upon launching the app for the first time, users with zero verses are greeted by a blank list and a passive text string (`"No verses added yet"`). They cannot experience the core value proposition—reciting scripture aloud with voice verification—without undertaking the cognitive chore of searching, typing, or configuring a translation first.
2. **Missing Daily Habit Loop**: Memory streaks currently exist only on individual verse cards. There is no global app streak or daily progress tracker. Learners lack a unified daily goal (e.g. "Review your 3 verses today to protect your 5-day streak"), which reduces the urgency to open the app every morning.
3. **Absence of Habit Closure & Celebration**: When all due verses for the day are finished, the app presents a flat text line without celebration, visual feedback, or a countdown to tomorrow. Users are left wondering if they did enough or what to do next.
4. **Isolated Practice without Social Growth**: Scripture memorization is inherently communal—practiced in church small groups, Bible studies, discipleship pairings, and families. Currently, users have no way to share a favorite verse or an entire curated topical deck with a friend, missing a vital word-of-mouth growth and accountability mechanism.

---

## Solution

A cohesive, high-retention Home Screen and Social Sharing experience:
1. **First-Run Interactive Sandbox (Acts 2:38)**: A zero-commitment welcome hero card that lets new users immediately test all three tiers of voice recall (Echo $\rightarrow$ Cloze $\rightarrow$ Recite) using an iconic passage (Acts 2:38) in under 60 seconds, with an opt-in prompt afterwards to either save the verse or leave their library clean.
2. **Global Daily Streak & Habit Progress Banner**: A prominent habit banner at the top of the Home Screen displaying the user's active daily streak (e.g. `🔥 4 Day Streak`) and a live daily progress bar (`2 of 3 Due Verses Reviewed Today`).
3. **Daily Done Celebration Victory Card**: A rewarding, celebratory state displayed when all due reviews are completed, confirming streak protection, giving next-day review visibility, and offering unmetered ahead-of-time practice.
4. **Polished Verse Status Cards**: Enhanced visual hierarchy featuring clear urgency pills (`Due Today`, `Mastered`, `Learning`), deck tags, last review accuracy, and dedicated `🎤 Recite` buttons.
5. **Deck Tags & Viral Sharing Pipeline**: Lightweight `#Deck` tags on verses, Home Screen deck filter pills, and a dual-format sharing pipeline using the native OS share sheet (human-readable message + universal import link) paired with an automatic clipboard import preview modal.

---

## User Stories

### First-Run Onboarding & Interactive Sandbox
1. As a new user opening the app for the first time with an empty library, I want to see an inviting Welcome Card featuring Acts 2:38, so that I can immediately understand what the app does without configuring anything.
2. As a new user on the Welcome Card, I want a single "Try Interactive Recitation" button, so that I can experience the 3-tier voice recall loop within 15 seconds of installing the app.
3. As a new user testing Acts 2:38 in the sandbox, I want to experience Echo Mode, Cloze Practice, and Blind Recitation with real voice recognition, so that I can feel the power of voice-guided scripture memorization.
4. As a new user finishing the Acts 2:38 sandbox recitation, I want a choice dialog asking whether I want to save Acts 2:38 to my permanent memory deck or continue exploring without saving, so that my personal review queue is not cluttered with verses I did not ask for.
5. As a new user who chooses "Add to My Verses", I want Acts 2:38 added to my library and scheduled for spaced repetition review tomorrow, so that I start my daily memorization journey with a saved verse.
6. As a new user who chooses "Explore App without Saving", I want to return to the Home Screen with an empty library, so that I can pick my own starter pack or type a personal verse.

### Daily Habit Formation & Global Streaks
7. As a daily learner opening the app, I want to see my current global daily streak displayed prominently at the top of the Home Screen (e.g. `🔥 5 Day Streak`), so that I feel motivated to maintain my spiritual habit.
8. As a daily learner, I want completing at least one official Level 3 recitation in a calendar day to protect and advance my daily streak, so that building the habit is rewarding rather than punitive.
9. As a daily learner with verses due today, I want to see a progress bar showing how many due verses I have completed out of today's total (e.g. `2 of 3 Reviewed`), so that I have a clear sense of progress toward today's goal.
10. As a daily learner who completes all due reviews for the day, I want the Home Screen to replace the due list with a celebratory "Daily Goal Achieved! 🎉" card, so that I experience a sense of accomplishment and closure.
11. As a learner viewing the Daily Done Victory Card, I want to see when my next review is due (e.g. "Next review due tomorrow"), so that I know my review schedule is handled by the spaced repetition engine.
12. As a motivated learner who has cleared today's queue, I want an option to "Practice Ahead (Unmetered)", so that I can continue rehearsing verses without altering my spaced repetition intervals.

### Polished Verse List Cards
13. As a learner scanning my verse library, I want overdue or due-today verses highlighted with an eye-catching "Due Today" status pill, so that I immediately know which verses require my attention.
14. As a learner with mastered verses, I want them labeled with a green "Mastered" status pill and their current review interval, so that I can celebrate my long-term memory retention.
15. As a learner looking at a verse card, I want to see my last review accuracy score (e.g. `95%`), so that I know how well I performed on my previous recitation.
16. As a learner ready to recite, I want a prominent, dedicated `🎤 Recite` button on the card with a clear touch target, so that starting a recitation is instantaneous.

### Deck Collections & Viral Sharing
17. As a learner organizing my verses, I want to assign an optional Deck Tag (e.g. `#Peace`, `#Gospel`, `#SermonOnTheMount`) to my verses, so that I can group related passages together.
18. As a learner on the Home Screen, I want filter pills along the top to filter by `#Deck` alongside `Due Today` and `All`, so that I can focus on a specific theme or collection.
19. As a learner with a curated deck, I want a "Share Deck" button that opens the native OS share sheet (WhatsApp, iMessage, Mail, Telegram), so that I can send the deck to my church small group or friends.
20. As a recipient reading a shared message without the app installed, I want to see the full passage text and references formatted clearly in plain text, so that I can read and meditate on the verses immediately in my messaging app.
21. As a recipient opening the app with a shared link or copied share payload, I want the app to automatically detect the shared deck and open an "Import Shared Deck" Preview Modal, so that I don't have to manually copy and paste each verse.
22. As a user previewing a shared deck, I want to see the deck title, creator note, and individual verses with checkboxes, so that I can choose which verses to import into my library.
23. As a user tapping "Import All", I want all selected verses added to my library under that deck name in a single tap, so that I can begin practicing them immediately.

---

## Implementation Decisions

### 1. Data Schema & Engine Extensions
- **Verse Model**: Add an optional `deck?: string` property to the `Verse` domain type.
- **Global Streak Domain State**: Track `currentStreak: number`, `longestStreak: number`, and `lastActiveDate: string | null` (calendar date `YYYY-MM-DD`).
- **Streak Evaluation**: Update `recordReview` in `VerseEngine`:
  - When an official review is recorded, check `lastActiveDate`.
  - If `lastActiveDate === today`, no streak change.
  - If `lastActiveDate === yesterday`, increment `currentStreak` by 1 and update `longestStreak`.
  - If `lastActiveDate < yesterday` (missed day), reset `currentStreak` to 1.
  - Set `lastActiveDate = today`.
- **Habit Summary API**: Expose `getHabitStats()` returning `{ currentStreak, longestStreak, dueCount, completedTodayCount, totalDueToday }`.
- **Deck Import API**: Expose `importDeck(deckName: string, verses: Array<{ reference: string; text: string; translation?: string }>): Promise<Verse[]>`.

### 2. Pure Deck Sharing Utility
- **Payload Format**: A compressed, URL-safe base64 string encoding:
  ```json
  {
    "name": "Acts & Early Church",
    "verses": [
      { "ref": "Acts 2:38", "text": "Peter replied...", "trans": "WEB" }
    ]
  }
  ```
- **Share Message Format**:
  ```
  📖 Memorize scripture with me on Voice AI Scripture!
  Deck: Acts & Early Church (1 verse)

  1. Acts 2:38 (WEB)
  "Peter replied, 'Repent and be baptized...'"

  Tap to recite this deck in Voice AI Scripture:
  https://voice-scripture.app/i#<compact-payload>
  ```
- **Clipboard & Link Detection**: Check clipboard for `https://voice-scripture.app/i#` or `voice-scripture://deck?data=`, decode payload safely, and trigger the import preview modal.

### 3. UI Modules & Components
- **`HabitBanner`**: Positioned below the header on `HomeScreen`, displaying the fire streak badge, progress text, and a rounded progress bar.
- **`SandboxWelcomeCard`**: Displayed on `HomeScreen` when `summary.allVerses.length === 0`. Contains Acts 2:38 teaser and `🎤 Try Interactive Recitation (Acts 2:38)` action.
- **`DailyDoneCard`**: Displayed when `summary.dueCount === 0 && summary.allVerses.length > 0` and filter is `due`. Displays celebration iconography, streak protection badge, and practice-ahead actions.
- **`SharedDeckModal`**: Modal dialog rendering deck name, verse count, scrollable verse preview cards, and an `[Import All Verses]` primary action.
- **`ReviewScreen` Sandbox Support**: Accepts `isSandbox?: boolean` and `onSandboxComplete?: (verse: Verse, saveRequested: boolean) => void`. Shows a post-recite dialog offering to save Acts 2:38 to the user's permanent collection or dismiss cleanly.

---

## Testing Decisions

### Test Characteristics & Philosophy
- **External Behavior Verification**: Only assert user-visible state, transitions, and public module contracts. Never assert private implementation flags.
- **Hermetic & Fast**: All tests run in Node/Jest without network calls, native OS dependencies, or real device clocks (using Jest fake timers where appropriate).

### Modules Tested
1. **`deckSharing.test.ts`**:
   - Encodes a sample deck with multiple verses into a compact URL-safe payload.
   - Decodes valid payloads back into exact deck name and verse structures.
   - Gracefully returns `null` for malformed, truncated, or tampered strings without throwing.
   - Formats human-readable share messages with passage citations and deep links.
2. **`VerseEngine.test.ts` (Global Streak & Deck Import)**:
   - Increments streak when an official review is performed on consecutive calendar days.
   - Preserves streak when multiple reviews are performed on the same calendar day.
   - Resets streak to 1 when more than 24 hours (a full calendar day) have elapsed since last active date.
   - Correctly calculates `completedTodayCount` and `totalDueToday`.
   - Imports a shared deck with custom deck tags without duplicating existing verses.
3. **`HomeScreen.test.tsx`**:
   - Renders `SandboxWelcomeCard` when verses list is empty.
   - Renders `HabitBanner` with streak count and progress bar.
   - Renders `DailyDoneCard` when `dueCount === 0` and `allVerses > 0`.
   - Filters verses when tapping `#Deck` filter chips.
   - Renders `SharedDeckModal` upon detecting a shared deck payload and imports verses on confirmation.

### Prior Art
- `src/services/RecitationSession.test.ts` (deterministic session testing with simulated seams).
- `src/screens/ReviewScreen.test.tsx` (component rendering, user events, and act wrapping).
- `src/components/PackBrowserModal.test.tsx` (verse import and deck selection flows).

---

## Out of Scope

1. **Cloud User Authentication**: Cloud sign-in (Firebase/Supabase) and backend database synchronization remain out of scope; all data remains local-first on device.
2. **Real StoreKit / In-App Billing**: Real App Store and Google Play IAP integrations are deferred to store packaging phase.
3. **Live Web Hosting of `voice-scripture.app`**: The deep link URL format is a standardized custom URI scheme and web URL anchor; deploying an actual web landing page is out of scope.
4. **Deck Editing / Re-ordering**: Re-ordering verses inside decks or batch deck deletion; lightweight deck tagging covers categorization and sharing.

---

## Further Notes

- **Language Support**: Acts 2:38 text should support both English (WEB) and Portuguese (Almeida) according to the user's default locale or language selection.
- **Privacy Assurance**: Shared decks only contain the verses selected by the user; no user profile, email, or device ID is ever embedded in the share payload.
