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

Before pushing: `npm run scan:secrets`, `npm test`, `npm run lint`, then
`npm run build`. All four must be clean.

## Structure

**Read this before adding any claim about the arrangement.** The scaffold this
repo grew from described a pooled BVI Incubator Fund: 20 investors, USD 20m cap,
units, a monthly NAV strike, subscriptions and redemptions. None of that was
true. It was removed from the copy in two passes once the owner corrected it,
and from the data model in a third.

What the firm actually does, as stated by the owner:

- **Separate accounts, never pooled.** Each client has their own account.
- **The account is the client's**, opened with a broker in the client's own name
  and under the client's own credentials.
- **KJC is the intermediary**, not the broker and not the custodian.
- **The firm does not hold client money.** Its authority is to trade the account.
- **Clients from any country.** The site used to exclude US persons. The owner
  removed that on 19 October 2026: the programme is offered to anyone who passes
  the firm's identity and anti-money-laundering checks. Whether it may lawfully
  be offered to a given person is set by the law where that person lives, not
  by where the firm is, and the risk page says so. This was raised with the
  owner when the exclusion came out.

Consequences that keep catching people out:

- There is **no NAV strike**, no units, no subscriptions and no redemptions. Any
  copy describing them is wrong.
- There is **no notice period** the firm can impose, because it does not hold the
  money and cannot gate a withdrawal.
- The **broker's statement is authoritative**, not any valuation of ours.

Still unconfirmed, and deliberately absent from the site rather than guessed:

- Which broker the accounts are held with.
- Where the firm is established. The owner says it has no fixed base and that
  the domain will change; when it does, update `NEXT_PUBLIC_SITE_URL`, the
  `FALLBACK` in `src/lib/site.js` and the canonical-domain tests together.
- Whether the trading authority is genuinely trade-only, or also permits
  withdrawal. The site currently states trade-only. **If that is wrong, the
  governance and disclosures pages are wrong and must be corrected first.**
- The fee basis. The site defers to the client agreement and states no numbers.
- How long client records must be kept, and under which anti-money-laundering
  framework. The privacy page used to claim seven years under the BVI regime;
  that number was never verified, so it now states the obligation without one.
- Whether there is any minimum. None is stated anywhere, on the site or in the
  schema. The scaffold's USD 20,000 was never confirmed and has been removed;
  do not add a figure until the owner states one.
- On what basis the firm is permitted to manage client accounts, and how the
  programme may lawfully be promoted.

**The site says what the firm does, never who it is or where it is from.** No
location, jurisdiction, address, founding date, history or people, on any page,
in the metadata, or in the structured data. The owner asked for this. It is why
there is no Firm page (`/en/firm` redirects home), why the header clock reads
UTC rather than city times, and why the terms and disclosures defer the entity
and its governing law to the client agreement. `tests/site.test.mjs` rejects the
place names, the old address and founding-date wording anywhere under `src/`.

The header tape is built in `src/lib/ticker.js` from `home.ledger` plus
`ticker.extra` in the dictionary, so it cannot advertise a term the home page
contradicts. `tests/ticker.test.mjs` rejects any digit or pooled-fund word on
it: the tape carries terms, never figures.

When it is built, the portal is the record of the **relationship**, not the
record of the money: the mandate and its limits, a log of what the firm did
under it, documents, fees with the matching broker statement reference,
notices, and a desk note. Balances, positions and trades stay with the broker.
The programme page promises there is no version of the numbers only the firm
can see, and a second dashboard would break that the first time it disagreed.

`supabase/schema.sql` is modelled on exactly that. Nothing consumes it yet
(`/[lang]/portal` is a holding page with no login behind it):

- `clients` — one row per enquiry or client, through the steps the contact
  and portal pages describe: enquiry, agreement issued, account opening,
  active, paused, ended, declined. US-person status is recorded for tax
  reporting but refuses nobody: clients are accepted from any country.
- `broker_accounts` — the client's own account: broker name as free text,
  the last four characters of the account number, base currency, and when the
  authority was granted or revoked. No credential of any kind and no full
  account number.
- `mandates` — the registers and limits the firm may trade under in one
  account, tied to the client agreement. A check allows only a `trade_only`
  authority scope. Terms are fixed once issued; an amendment is a new mandate
  that supersedes the old one.
- `mandate_activity` — append-only log of what the firm did under a mandate:
  a kind, a summary and a broker reference, never a price, quantity or P&L.
- `fee_charges` — the amount charged for a period, the agreement clause it
  rests on, and the broker statement line that matches it, which is required
  before a charge can be marked paid. No rate and no basis.
- `documents`, `notices` with `notice_acknowledgements`, and `desk_notes`
  (readable only by active clients, once published).
- `kyc_checks` — the identity, address, source of funds and tax residence
  checks the privacy page lists, plus the US-person determination. No regime
  is named.

`src/lib/audit.js` names its actions on the same model. Neither file has a
table, column or action for units, NAV, subscriptions, redemptions, a balance
or a valuation, and their tests fail if one appears.

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
to be re-runnable: `if not exists` throughout, enums guarded, policies and
triggers dropped before they are created. Row-level security on every table.

- **Reads.** Every policy is `for select to authenticated`, limited to the
  caller's own rows through `clients.auth_user_id`. anon reads nothing.
- **Writes.** The service role only, from server code. No role has a write
  policy, and insert, update, delete and truncate are revoked from anon and
  authenticated as well.
- **Append-only.** `audit_events`, `mandate_activity` and
  `notice_acknowledgements` refuse update, delete and truncate by trigger,
  which binds the service role too. A correction is a new row. Because the
  `on delete set null` on `audit_events.actor_user_id` is itself an update, an
  auth user who appears in the audit trail cannot be deleted: ban them in
  Supabase Auth instead.
- **Authority.** `mandates.authority_scope` is checked to be `trade_only`,
  because the governance and disclosures pages say so. If the real authority
  is broader, those pages are corrected first and the check after.

The schema replaces a pooled-fund draft (`investors`, `nav_strikes`,
`subscriptions`, `redemptions`, `units_ledger`, `high_water_marks`). That draft
was never applied to any project, and the file drops nothing. If it was ever
applied somewhere, drop those tables and their enum types by hand.

CI has no Postgres, so `tests/schema.test.mjs` parses the file. What a parse
cannot show is behaviour: two clients isolated from each other in every table,
the triggers firing, the US-person and authority checks refusing a row. That
was exercised against a local Postgres 16, with Supabase's roles and
`auth.uid()` stubbed, when this model was written. Do it again after any
change to the schema.
