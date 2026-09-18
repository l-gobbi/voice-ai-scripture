# 03: text-flashcard-review

**What to build:** The "Free Tier" text-based review loop. Tapping a verse opens a flashcard, the user manually reveals the text, self-grades, and the app updates the SRS schedule.

**Blocked by:** 01-init-and-add-verse, 02-pure-logic-engines

**Status:** closed

- [x] Add a "Review" screen navigated to when a verse is tapped from the home list.
- [x] Display the verse reference and hide the verse text until a "Reveal" button is pressed.
- [x] Provide "Pass" and "Fail" grading buttons.
- [x] On grade, pass the score to the SRS engine (from 02) to update the verse's next review date in local storage.
- [x] Return the user to the home list.
