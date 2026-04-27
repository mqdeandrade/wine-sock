# E2E Test Task List

## Setup / Smoke

- [x] App loads landing page.
- [x] Varietals load successfully from `/api/varietals`.
- [x] Create tasting shows lobby, code pill, host controls, leaderboard, and history.

## Invite Links And Session Restore

- [x] Tapping/clicking session code copies a join link.
- [x] Opening `/?code=SESSION` loads the tasting instead of only prefilling the landing form.
- [x] New attendee opening invite link sees name prompt.
- [x] Existing attendee opening invite link in same browser restores their participant session.
- [x] Host refreshing `/?code=SESSION` restores host controls from local storage.
- [x] Different browser opening host invite link does not get host controls.

## Joining

- [x] Attendee can join lobby with code and name.
- [x] Duplicate attendee name is rejected.
- [x] Attendee can join after tasting has started.
- [x] Attendee cannot join after tasting is completed.
- [x] Late attendee appears in participant/leaderboard state.

## Round Lifecycle

- [x] Host can start first round.
- [x] Attendees see searchable varietal picker while round is guessing.
- [x] Guess can be searched by varietal name, tasting note, descriptor, or region.
- [x] Attendee can lock one guess.
- [x] Locked attendee cannot change their guess.
- [x] Outstanding guessers list updates after each guess.
- [x] Outstanding guessers list collapses to `+N more` after threshold.
- [x] Round automatically moves to awaiting answer when everyone has guessed.
- [x] Host can end guessing early.
- [x] Attendees who do not guess before early close show no guess.

## Host Answer / Reveal

- [x] Host answer picker is searchable.
- [x] Host can select correct varietal from large cards.
- [x] Reveal is disabled until a correct varietal is selected.
- [x] Revealed round shows correct/incorrect state to attendees.
- [x] Leaderboard updates after reveal.
- [x] Host can start another round after reveal.

## Late Join Behavior

- [x] If someone joins during an active guessing round, they are shown as outstanding.
- [x] The active round waits for the late joiner guess unless host ends early.
- [x] Late joiner can guess in the active round.
- [x] Late joiner shows `No guess` for already revealed earlier rounds.

## History

- [x] History rounds are newest-first.
- [x] Only the newest history round is open by default.
- [x] Older rounds are collapsed by default.
- [x] Expanding a round shows each participant guess.
- [x] Missed guesses show both guessed varietal and correct answer.
- [x] No-guess participants show `No guess`.
- [x] Correct guesses show guessed varietal and `Correct`.

## Leaderboard

- [x] Leaderboard starts aligned at the top beside history on desktop.
- [x] Leaderboard scores sort descending.
- [x] Participants with no correct guesses remain visible with score `0`.

## Completion

- [x] Host can end tasting.
- [x] Completed tasting prevents starting new rounds.
- [x] Completed tasting results remain viewable by code.
- [x] New attendees cannot join completed tasting.

## Realtime / Multi-Browser

- [x] Host sees attendees join without refresh.
- [x] Attendee sees round start without refresh.
- [x] Host sees guesses lock without refresh.
- [x] Attendees see reveal without refresh.
- [x] Leaderboard/history update without refresh after reveal.

## Mobile UX Checks

- [x] Main attendee guessing flow works at mobile viewport.
- [x] Host answer picker is usable at mobile viewport.
- [x] Selected card highlight is not clipped.
- [x] Waiting list remains compact with many attendees.
