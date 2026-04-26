# Wine Sock

A phone-first web app for running blind wine tasting nights.

## Development

```sh
npm install
npm run dev
```

The app is organized as an npm workspace:

- `apps/client`: React + Vite frontend
- `apps/server`: Express + Socket.IO backend
- `packages/shared`: shared TypeScript domain types

## Product Summary

Hosts create a tasting and share a join code. Attendees join during the lobby with a display name, then lock one varietal guess per round. When guessing closes, the host enters the correct varietal and the app reveals results, leaderboard, and history. Completed tastings remain visible to anyone with the code.
