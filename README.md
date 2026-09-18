# KJC Capital

**This is not a fund.** KJC Capital manages each client's own broker account
under a limited trading authority. Nothing is pooled, the firm does not hold
client money, and there are no units, no NAV strike, and no subscriptions or
redemptions. See **Structure** below before adding any claim about where client
money sits.

Gold-led programme across four registers: precious metals (the anchor),
proprietary algorithmic strategies, a bounded digital-asset allocation, and
select alternatives taken by exception.

Public site: https://www.kjccapital.co.uk

The trading strategy is proprietary and is not disclosed. The public site
presents the firm.

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

## Structure

**Read this before adding any claim about the arrangement.** The scaffold this
repo grew from described a pooled BVI Incubator Fund: 20 investors, USD 20m cap,
units, a monthly NAV strike, subscriptions and redemptions. None of that was
true. It was removed in two passes once the owner corrected it.

What the firm actually does, as stated by the owner:

- **Separate accounts, never pooled.** Each client has their own account.
- **The account is the client's**, opened with a broker in the client's own name
  and under the client's own credentials.
- **KJC is the intermediary**, not the broker and not the custodian.
- **The firm does not hold client money.** Its authority is to trade the account.
- **No US persons.**

Consequences that keep catching people out:

- There is **no NAV strike**, no units, no subscriptions and no redemptions. Any
  copy describing them is wrong.
- There is **no notice period** the firm can impose, because it does not hold the
  money and cannot gate a withdrawal.
- The **broker's statement is authoritative**, not any valuation of ours.

Still unconfirmed, and deliberately absent from the site rather than guessed:

- Which broker the accounts are held with.
- Whether the trading authority is genuinely trade-only, or also permits
  withdrawal. The site currently states trade-only. **If that is wrong, the
  governance and disclosures pages are wrong and must be corrected first.**
- The fee basis. The site defers to the client agreement and states no numbers.
- Whether USD 20,000 is a real minimum. It survives only as a check constraint
  in `supabase/schema.sql` and appears nowhere on the site.
- On what basis the firm is permitted to manage client accounts, and how the
  programme may lawfully be promoted.

The header tape is built in `src/lib/ticker.js` from `home.ledger` plus
`ticker.extra` in the dictionary, so it cannot advertise a term the home page
contradicts. `tests/ticker.test.mjs` rejects any digit or pooled-fund word on
it: the tape carries terms, never figures.

Two things are still modelled on a pooled fund and were left alone deliberately,
because redesigning a data model is a bigger decision than correcting copy:

- `supabase/schema.sql` — `units_ledger`, `high_water_marks`, `subscriptions`,
  `redemptions`.
- `src/lib/audit.js` — `SUBSCRIPTION_*`, `REDEMPTION_*`, `NAV_STRIKE_RECORDED`.

Neither is consumed by anything yet (`audit.js` has only its own test, and no
portal exists). Both need redesigning around per-client accounts before the
portal is built. Do not extend either as-is.

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
