# Wine Sock Task List

## Vertical Slice 1: Project Scaffold

- [x] Create npm workspace structure.
- [x] Add client, server, and shared package placeholders.
- [x] Add baseline TypeScript configuration.
- [x] Document implementation plan and development commands.

## Vertical Slice 2: Persistence And Domain

- [x] Add Prisma schema for tastings, participants, rounds, guesses, and varietals.
- [x] Add database client and repository layer.
- [x] Seed exhaustive initial varietal list with tasting notes.
- [x] Add domain logic for scoring and round transitions.

## Vertical Slice 3: Backend API And Realtime Events

- [x] Implement tasting creation and join code generation.
- [x] Implement participant join with session tokens.
- [x] Implement round lifecycle endpoints.
- [x] Implement guess locking and reveal flow.
- [x] Add Socket.IO rooms and tasting update events.

## Vertical Slice 4: Phone-First React App

- [x] Build create/join screens.
- [x] Build lobby and host controls.
- [x] Build varietal picker with notes.
- [x] Build locked-in, reveal, leaderboard, and history views.
- [x] Persist session tokens in local storage.

## Vertical Slice 5: Verification

- [x] Add unit tests for scoring and round lifecycle.
- [ ] Add API integration tests for the primary tasting flow.
- [ ] Add browser smoke test for host plus attendee flow.
- [x] Document any remaining deployment assumptions.
