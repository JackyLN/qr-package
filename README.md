# Tet Li Xi Backend (Next.js + Prisma + VietQR)

Backend-only Next.js App Router project for a Tet li xi game with SQLite persistence and VietQR payout QR generation.

## Stack

- Next.js App Router + TypeScript
- Prisma + SQLite
- `qrcode` package for PNG Data URL generation

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`:

```env
DATABASE_URL="file:./dev.db"
ADMIN_PASSCODE="your-admin-passcode"
```

3. Run migrations:

```bash
npx prisma migrate dev
```

4. Seed prizes (optional, you can also call `POST /api/admin/reset`):

```bash
npx prisma db seed
```

5. Start development server:

```bash
npm run dev
```

## Key APIs

### Public

- `POST /api/play`
  - body: `{ "envelopeIndex": 0 }` (optional/cosmetic)
  - returns: `{ "claimId": "...", "amountVnd": 50000 }`
- `GET /api/play/device`
  - returns current device identifier used for replay guard
- `GET /api/claim/:claimId`
- `PATCH /api/claim/:claimId`
  - body: `{ "winnerName": "...", "winnerPhone": "...", "bankBin": "970436", "bankAccountNo": "123456789" }`

### Admin (header required)

All admin routes require:

```http
x-admin-passcode: <ADMIN_PASSCODE>
```

- `GET /api/admin/pending`
- `POST /api/admin/device-allowance`
  - body: `{ "deviceId": "uuid", "extraPlays": 2 }`
  - grants extra play attempts for that specific device
- `GET /api/admin/payout-qr/:claimId`
  - returns `{ payload, dataUrl }`
- `POST /api/admin/mark-paid/:claimId`
  - body: `{ "paidRef": "optional-ref" }`
- `POST /api/admin/reset`

## Notes

- Claim assignment in `POST /api/play` uses Prisma transaction + retry strategy to stay safe under concurrent requests.
- A prize can only be claimed once via unique constraint on `Claim.prizeId`.
- Anti-replay guard: after a successful `POST /api/play`, repeated play attempts from the same browser are blocked.
- Admin can grant per-device exceptions via `POST /api/admin/device-allowance` (1 or more extra plays).
- VietQR payload uses TLV format and CRC16-CCITT FALSE.
