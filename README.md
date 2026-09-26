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

## Admin portal

`/admin` (Dashboard, Products, Categories, Enquiries, Customers). Create the first staff
login from your terminal, so the password never leaves your machine:

```bash
npm run db:create-admin you@example.com "Your Name"      # prompts for the password (hidden)
```

- Staff passwords are stored only as Argon2id hashes (the database rejects anything else).
- Separate `sn_admin` cookie: signed, HttpOnly, SameSite=Strict, 8 h. Changing a password
  signs out every other session; 5 wrong attempts lock the account for 15 minutes.
- Every admin page, Server Action and `/api/admin/*` route re-checks the session against
  the `admins` table; `src/proxy.ts` only does the fast redirect to the login page.
- Product photos upload one per request (resized to ≤1600 px in the browser first) and are
  stored as base64 variants. Saving a product refreshes the storefront cache immediately.

## Environment

See `.env.example`. Production requires `SESSION_SECRET`.
