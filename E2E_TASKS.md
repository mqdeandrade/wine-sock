# E2E Test Task List

## Setup / Smoke

- [x] App loads landing page.
- [x] Varietals load successfully from `/api/varietals`.
- [x] Create tasting shows lobby, code pill, host controls, leaderboard, and history.

## Invite Links And Session Restore

- [ ] Tapping/clicking session code copies a join link.
- [ ] Opening `/?code=SESSION` loads the tasting instead of only prefilling the landing form.
- [ ] New attendee opening invite link sees name prompt.
- [ ] Existing attendee opening invite link in same browser restores their participant session.
- [ ] Host refreshing `/?code=SESSION` restores host controls from local storage.
- [ ] Different browser opening host invite link does not get host controls.

## Joining

- [ ] Attendee can join lobby with code and name.
- [ ] Duplicate attendee name is rejected.
- [ ] Attendee can join after tasting has started.
- [ ] Attendee cannot join after tasting is completed.
- [ ] Late attendee appears in participant/leaderboard state.

## Round Lifecycle

- [ ] Host can start first round.
- [ ] Attendees see searchable varietal picker while round is guessing.
- [ ] Guess can be searched by varietal name, tasting note, descriptor, or region.
- [ ] Attendee can lock one guess.
- [ ] Locked attendee cannot change their guess.
- [ ] Outstanding guessers list updates after each guess.
- [ ] Outstanding guessers list collapses to `+N more` after threshold.
- [ ] Round automatically moves to awaiting answer when everyone has guessed.
- [ ] Host can end guessing early.
- [ ] Attendees who do not guess before early close show no guess.

## Host Answer / Reveal

- [ ] Host answer picker is searchable.
- [ ] Host can select correct varietal from large cards.
- [ ] Reveal is disabled until a correct varietal is selected.
- [ ] Revealed round shows correct/incorrect state to attendees.
- [ ] Leaderboard updates after reveal.
- [ ] Host can start another round after reveal.

## Late Join Behavior

- [ ] If someone joins during an active guessing round, they are shown as outstanding.
- [ ] The active round waits for the late joiner guess unless host ends early.
- [ ] Late joiner can guess in the active round.
- [ ] Late joiner shows `No guess` for already revealed earlier rounds.

## History

- [ ] History rounds are newest-first.
- [ ] Only the newest history round is open by default.
- [ ] Older rounds are collapsed by default.
- [ ] Expanding a round shows each participant guess.
- [ ] Missed guesses show both guessed varietal and correct answer.
- [ ] No-guess participants show `No guess`.
- [ ] Correct guesses show guessed varietal and `Correct`.

## Leaderboard

- [ ] Leaderboard starts aligned at the top beside history on desktop.
- [ ] Leaderboard scores sort descending.
- [ ] Participants with no correct guesses remain visible with score `0`.

## Completion

- [ ] Host can end tasting.
- [ ] Completed tasting prevents starting new rounds.
- [ ] Completed tasting results remain viewable by code.
- [ ] New attendees cannot join completed tasting.

## Realtime / Multi-Browser

- [ ] Host sees attendees join without refresh.
- [ ] Attendee sees round start without refresh.
- [ ] Host sees guesses lock without refresh.
- [ ] Attendees see reveal without refresh.
- [ ] Leaderboard/history update without refresh after reveal.

## Mobile UX Checks

- [ ] Main attendee guessing flow works at mobile viewport.
- [ ] Host answer picker is usable at mobile viewport.
- [ ] Selected card highlight is not clipped.
- [ ] Waiting list remains compact with many attendees.
