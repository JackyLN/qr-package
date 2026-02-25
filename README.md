# Tet Li Xi Game (Next.js + Prisma + VietQR)

A full-stack Tet lucky envelope game built with Next.js App Router and Prisma.
Players open one envelope per session, submit payout details, and admins process payouts with generated VietQR.

This repo is designed to be self-hosted and easy to share with other teams.

## Live Demo

- Public site: `https://lixi.xinivia.xyz`

## Screenshots

Screenshot placeholders are ready in `docs/images/`.

Suggested files (replace with your own):
- `docs/images/01-home.png`
- `docs/images/02-play.png`
- `docs/images/03-result-form.png`
- `docs/images/04-admin-config.png`
- `docs/images/05-admin-qr.png`

You can see details in `docs/images/README.md`.

## Features

- Envelope opening animation and result reveal
- One-play guard per browser/device session
- Global session invalidation when admin resets game
- Admin grant of extra plays for specific device IDs
- Admin game toggle (ON/OFF)
- Configurable prize pool and envelope settings
- Optional double-or-nothing gameplay
- Bank list sync and bank logos support
- VietQR payload + QR image generation for payouts
- Mark paid flow with payout reference tracking

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Prisma ORM
- SQLite (default)
- Tailwind CSS
- `qrcode` for PNG data URL generation

## Project Structure

- `src/app/page.tsx`: landing page and website QR
- `src/app/play/page.tsx`: envelope selection flow
- `src/app/result/[claimId]/page.tsx`: winner form and double-or-nothing
- `src/app/admin/page.tsx`: admin control panel
- `src/app/api/**`: API routes
- `lib/game.ts`: prize claim and reset logic
- `lib/play-guard.ts`: device/session play guard
- `lib/vietqr.ts`: VietQR payload encoder + CRC16
- `prisma/schema.prisma`: data model

## Quick Start (Local)

### 1) Prerequisites

- Node.js 20+
- npm 10+

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Default values:

```env
DATABASE_URL="file:./dev.db"
ADMIN_PASSCODE="change-me"
```

### 4) Run database migrations

```bash
npx prisma migrate dev
```

### 5) Seed sample data (optional)

```bash
npm run db:seed
```

### 6) Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

- `DATABASE_URL`: Prisma database connection string
- `ADMIN_PASSCODE`: required for all admin API routes via `x-admin-passcode`

## NPM Scripts

- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: run ESLint
- `npm run prisma:generate`: Prisma client generate
- `npm run prisma:migrate`: run Prisma dev migration
- `npm run db:seed`: seed database

## Gameplay and Session Guard

### Public flow

1. User opens `/play`.
2. `POST /api/play` creates a claim and reserves one prize.
3. User is redirected to `/result/:claimId`.
4. User submits payout info via `PATCH /api/claim/:claimId`.
5. Admin opens QR and marks claim as paid.

### Anti-replay behavior

- A device cookie (`tet_device_id`) identifies the browser session.
- A session-versioned played cookie (`tet_played_once_v{playSessionVersion}`) blocks replay in the same game round.
- Admin `Reset Game` increments `playSessionVersion`, invalidating old played cookies globally.
- Admin can still grant extra plays per device with `POST /api/admin/device-allowance`.

This means users can replay after a full reset without manual device-ID clearing.

## Admin Guide

Open `/admin` and log in with the passcode.

Main actions:
- Refresh pending claims
- Reset game (new prize pool + new play session version)
- Toggle game ON/OFF
- Save game config
- Sync bank list/logos
- Grant extra plays by device ID
- Generate payout QR per claim
- Mark claim as paid

## API Summary

### Public APIs

- `POST /api/play`
- `GET /api/play/device`
- `GET /api/banks`
- `GET /api/claim/:claimId`
- `PATCH /api/claim/:claimId`
- `POST /api/claim/:claimId/double-or-nothing`

### Admin APIs (require `x-admin-passcode`)

- `GET /api/admin/config`
- `PUT /api/admin/config`
- `GET /api/admin/pending`
- `POST /api/admin/reset`
- `POST /api/admin/device-allowance`
- `POST /api/admin/banks/sync`
- `GET /api/admin/payout-qr/:claimId`
- `POST /api/admin/mark-paid/:claimId`

## Docker Deployment

This repo includes `Dockerfile`, `docker-compose.yml`, and `docker/entrypoint.sh`.

### Production environment file

Create `.env.production` on server with at least:

```env
DATABASE_URL="file:/app/data/prod.db"
ADMIN_PASSCODE="your-strong-passcode"
NODE_ENV="production"
```

### Build and run

```bash
docker compose up -d --build
```

Important:
- The container entrypoint runs `npx prisma migrate deploy` before starting the app.
- `docker-compose.yml` mounts persistent paths:
  - `./data:/app/data`
  - `./public/banks:/app/public/banks`

## GitHub Actions Deployment Workflow

Workflow file: `.github/workflows/deploy-lixi-uat.yml`

It deploys through SSH and runs:
- `git fetch` + checkout/pull
- `docker build`
- `docker compose up -d --no-build`

Required repository secrets:
- `UAT_SSH_HOST`
- `UAT_SSH_USER`
- `UAT_SSH_KEY`
- `UAT_SSH_PORT` (optional, defaults to `22`)

## Suggested Reverse Proxy (Nginx)

Use Nginx to terminate TLS and proxy to app port `3012`.

Minimal upstream target:
- `http://127.0.0.1:3012`

Recommended:
- Enable HTTPS with Let's Encrypt
- Force HTTP to HTTPS redirect
- Set standard proxy headers (`Host`, `X-Forwarded-For`, `X-Forwarded-Proto`)

## Troubleshooting

- "Unauthorized" on admin APIs:
  - Check `ADMIN_PASSCODE` and `x-admin-passcode` header.
- Players still blocked after reset:
  - Confirm `POST /api/admin/reset` returns incremented `playSessionVersion`.
  - Confirm app is running latest build.
- QR not generated:
  - Claim must be `CLAIMED` and include `bankBin` + `bankAccountNo`.
- Bank logos missing:
  - Run `POST /api/admin/banks/sync` and ensure `public/banks` is writable.
- Migration issues in production:
  - Verify `DATABASE_URL` path and container volume mount.

## Security Notes

- Keep `ADMIN_PASSCODE` strong and private.
- Avoid exposing raw database files publicly.
- If publishing publicly, rotate passcodes and server keys before release.

## Contributing

1. Create a branch.
2. Make focused changes.
3. Run lint/build before opening PR.
4. Open PR with clear testing notes.

## License

This project is licensed under the MIT License. See `LICENSE`.
