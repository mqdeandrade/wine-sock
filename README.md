# Wine Sock

A phone-first web app for running blind wine tasting nights.

## Development

```sh
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run dev
```

The server expects `DATABASE_URL` to point at PostgreSQL. Copy `.env.example` to `.env` and adjust the URL for your local database before running migrations.

The app is organized as an npm workspace:

- `apps/client`: React + Vite frontend
- `apps/server`: Express + Socket.IO backend
- `packages/shared`: shared TypeScript domain types

## Product Summary

Hosts create a tasting and share a join code. Attendees join during the lobby with a display name, then lock one varietal guess per round. When guessing closes, the host enters the correct varietal and the app reveals results, leaderboard, and history. Completed tastings remain visible to anyone with the code.

## Verification

```sh
npm run typecheck
npm run test
npm run build
```

API integration and browser smoke tests are still pending; they should be added against a disposable PostgreSQL database.
