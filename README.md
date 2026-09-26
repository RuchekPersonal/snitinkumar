# S. Nitinkumar — Wholesale Website

Mobile-first wholesale catalogue and WhatsApp enquiry site. Next.js 16 (App Router) on Node,
hosted on Vercel, with data in Supabase Postgres. Requirements and diagrams live in `../documents`
(`RFD.md`, `FLOW-DIAGRAMS.md`).

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

In development a **Preview as** bar lets you switch between guest, pending and approved
retailer to check that rates are only shown to approved retailers.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run format` | Prettier |
| `node scripts/brand/generate.mjs` | Regenerate SN monogram icons and `og-default.jpg` |
| `npm run db:migrate` | Apply `supabase/migrations/*.sql` (needs `DATABASE_URL`) |
| `npm run db:seed` | Load the sample catalogue and images (safe to re-run) |
| `npm run db:create-admin <email> "<name>"` | Create a staff login; password is stored as an Argon2id hash |

## Where things are

| Path | Purpose |
|---|---|
| `src/lib/site.ts` | Business details (WhatsApp number, email, address) |
| `src/lib/server/catalog.ts` | Storefront data access (cached, tag `catalog`). **Strips prices unless the viewer is approved** |
| `src/lib/server/session.ts` | Signed session cookie, `canSeePrices()` |
| `src/lib/server/images.ts` + `src/app/api/img/…` | Base64 image store → cached image responses |
| `src/lib/server/enquiries.ts` + `src/app/api/enquiries` | Saves an enquiry and builds the WhatsApp message |
| `src/lib/server/db.ts` | Server-only Supabase client (secret key) |
| `supabase/migrations/` | Schema. RLS on every table; public keys have no access |
| `scripts/db/seed-data.ts` | Sample catalogue used by `db:seed` |
| `src/lib/seo.ts` | Page metadata incl. Open Graph for WhatsApp previews |
| `public/placeholders/` | Static design placeholders (hero, shop floor) |

## Environment

See `.env.example`. Production requires `SESSION_SECRET`.
