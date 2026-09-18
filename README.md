# KJC Capital

Gold-led managed fund. BVI-registered Incubator Fund under the Securities and
Investment Business (Incubator and Approved Funds) Regulations 2015. Web
platform for investor onboarding, subscription, redemption, and NAV reporting.

The book runs across four registers: precious metals (the anchor), proprietary
algorithmic strategies, a bounded digital-asset allocation, and select
alternatives taken by exception.

Public site: https://kjccapital.com

The trading strategy is proprietary and is not exposed to investors. The
public site presents the firm. The investor portal shows one number: the
investor's current balance.

## Stack

- Next.js 16 (App Router), plain JavaScript, `@/*` → `./src/*` via
  `jsconfig.json`. No TypeScript.
- React 19, Tailwind CSS v4 with tokens in `src/app/styles/globals.css`.
- Supabase — `@supabase/ssr`, `@supabase/supabase-js`. Auth, Postgres, RLS.
- Resend for outbound email. PDFKit for statements and legal PDFs.
- Deployed on Vercel from a private GitHub repo. Node 24 in CI.

## Commands

```bash
npm ci
npm run dev
npm test
npm run scan:secrets
npm run lint
npm run build
```

Before pushing: `npm run scan:secrets`, then `npm test`, then `npm run build`.

## Regulatory shape

- **BVI Incubator Fund.** Maximum 20 investors, USD 20 million cap, 2-year
  runway before graduation to Approved or Professional Fund is required.
- **Minimum subscription:** USD 20,000 (regulatory floor).
- **No US persons.**
- **No fund administrator, no auditor** at the Incubator stage. NAV is
  calculated in-house, so the code has to be right.

## Conventions

- Double quotes, semicolons. Match the surrounding file.
- One component per file, PascalCase, `export default function Name()`.
- Server Components by default. `"use client"` only for state, effects, or
  event handlers. Never pass a function as a prop from a server component
  into a client one.
- Supabase clients by context: `client.js` in the browser, `server.js` in
  RSCs and server actions, `admin.js` (service role) only in route handlers.
- Business logic in `src/lib/*.js` with a matching `tests/<name>.test.mjs`.
- No em-dashes in visible body copy.
- Commits: imperative, capitalised, no trailing period, no `feat:`/`fix:`
  prefixes, no emoji.

## Database

`supabase/schema.sql` is applied by hand in the Supabase SQL editor. Written
to be re-runnable. Row-level security on every table.
