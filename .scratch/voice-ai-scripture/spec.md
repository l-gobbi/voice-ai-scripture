---
labels: ["ready-for-agent"]
---

# Voice-AI Scripture Memory App Specification

## Problem Statement
Memorizing scripture is a vital discipline for many Christians, but traditional tools (like physical or digital flashcards) rely on self-reporting. Users look at a card, recite the verse in their head, and subjectively decide if they "got it right." This lacks accountability, precision, and the auditory reinforcement that comes from speaking the Word out loud.

## Solution
A mobile application (built with React Native/Expo) that leverages Voice AI to provide objective verification for scripture memorization. Users recite their memory verses out loud into their device. The app transcribes the audio, compares it against the exact biblical text, visually highlights missed or added words, and automatically schedules the next review using a Spaced Repetition System (SRS). The app operates on a freemium model, offering text-based flashcards for free and unlimited Voice-AI correction behind a ~$5/month subscription.

## User Stories
1. As a user, I want to add a new memory verse by typing the reference (e.g., John 3:16) and the text so that I can begin memorizing it.
2. As a user, I want to tap a microphone button and recite my verse out loud so that the app can evaluate my memory.
3. As a user, I want to see a visual diff of my recitation (highlighting words I missed, skipped, or added) so that I know exactly where my memory failed.
4. As a user, I want the app to automatically grade my attempt based on the accuracy of the transcription so that I don't have to self-report my success.
5. As a user, I want the app to schedule my next review of the verse based on a Spaced Repetition algorithm so that I review verses right before I am about to forget them.
6. As a user, I want a daily dashboard showing which verses are due for review today so that I can maintain my daily habit.
7. As a free user, I want to review verses using standard text-revealing flashcards so that I can still use the app without paying.
8. As a premium user, I want unlimited access to the Voice-AI verification feature so that I can practice hands-free with high accuracy.
9. As a premium user, I want to manage my subscription easily through the App Store / Play Store so that my payment is secure.

## Implementation Decisions
- **Framework:** The app will be built using React Native with Expo to ensure rapid cross-platform mobile development (iOS/Android) and easy access to native microphone APIs.
- **Voice-to-Text:** Audio will be recorded natively and sent to the OpenAI Whisper API (or equivalent fast transcription API) for highly accurate speech-to-text conversion.
- **Verification Logic:** The core verification will use a string diffing algorithm (e.g., Levenshtein distance or a custom word-level diff) to compare the expected verse text with the Whisper transcription, stripping out punctuation and normalizing casing.
- **Spaced Repetition:** The app will implement a standard SRS algorithm (e.g., SuperMemo-2 / SM-2) that adjusts the interval of the next review based on the accuracy score of the recitation.
- **Monetization/Auth:** RevenueCat will be used for managing in-app subscriptions (Freemium paywall). Supabase or Firebase will handle user authentication and cloud syncing of verses.
- **Data Privacy:** Audio files are sent to the transcription API and immediately discarded. They are not stored permanently.

## Testing Decisions
Since this is a greenfield project, we want to establish clear, high-level testing seams to avoid brittle implementation details:
- **Core Domain Logic (The Diff Engine):** The pure function that takes the `expectedVerse` and `transcribedAudioText` and returns the visual diff and accuracy score. This must be heavily unit-tested with various Edge Cases (stuttering, partial words, skipped words).
- **Core Domain Logic (The SRS Engine):** The pure function that takes a `verseState` and a `score` and returns the `nextReviewDate`.
- **Integration Seam:** We will mock the external Whisper API and the Native Audio Recorder. Tests will simulate passing text strings (representing the API response) into the verification flow to ensure the UI updates correctly without actually recording audio in the test runner.

## Out of Scope
- Social features (leaderboards, adding friends, sharing verses).
- Web app version (this is strictly a mobile-first app due to microphone dependencies).
- Built-in API fetching for copyrighted Bible translations (users will manually paste or we will provide public domain versions like KJV/WEB initially to avoid licensing issues).

## Further Notes
- Latency is critical. The time between the user stopping the recording and seeing the diff should be under 2 seconds to ensure a smooth UX.
- The marketing strategy relies heavily on beta-testing the initial build within Reddit (`r/TrueChristian`, etc.) and partnering with mid-tier Christian creators.
