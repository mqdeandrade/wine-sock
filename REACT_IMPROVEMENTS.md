# React Improvement Task List

## Correctness And Safety

- [x] Reset attendee guess UI state when the active round changes.
- [x] Harden participant session restoration against malformed local storage.
- [x] Replace the single global `busy` boolean with overlap-safe pending action state.
- [x] Strengthen client API response types for round mutations.

## Accessibility

- [x] Add live-region semantics for error and copy-status messages.
- [x] Expose selected varietal and answer cards as pressed toggle buttons.

## Structure

- [ ] Extract reusable hooks for async actions, varietal loading, and tasting sockets.
- [ ] Keep existing E2E coverage passing after the refactor.
