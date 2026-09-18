# KJC Capital

Gold-led managed fund domiciled in the British Virgin Islands. Web platform for
investor onboarding, subscription, redemption, and NAV reporting. See
**Regulatory shape** below before adding any claim about the fund's structure.

The book runs across four registers: precious metals (the anchor), proprietary
algorithmic strategies, a bounded digital-asset allocation, and select
alternatives taken by exception.

Public site: https://www.kjccapital.co.uk

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

**Unconfirmed. Do not add regulatory claims to the site without checking here
first.** The scaffold described the fund as a BVI Incubator Fund, capped at 20
investors and USD 20 million. The owner has since said the fund is not capped by
investor count, which the Incubator regime requires, so that description was
removed from every public page rather than left to contradict itself.

What the site currently asserts, and nothing beyond it:

- **Domiciled in the British Virgin Islands.**
- **Minimum subscription:** USD 20,000, enforced by a check constraint in
  `supabase/schema.sql`. A commercial minimum, not a regulatory floor.
- **No US persons.**
- Regulatory category, offer terms and any limits are deferred to the offering
  documents rather than stated on the site.

Still to confirm with the owner: the actual fund vehicle, whether an
administrator or auditor is appointed, and how the fund may lawfully be
promoted. NAV is calculated in-house, so the code has to be right.

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
