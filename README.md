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
- Fonts through `next/font`, served from the site. All but the Source Serif 4
  italic (in `src/app/fonts`) are downloaded from Google during `next build`,
  so the build needs outbound access to fonts.googleapis.com and
  fonts.gstatic.com and fails without it.
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

The portal shows a client their own return, quoted as **$KJC**, alongside the
record of the relationship: the mandate and its limits, a log of what the firm
did under it, documents, fees with the matching broker statement reference,
notices, and a desk note. The owner decided on the figures in October 2026. They
are the broker's figures, not a valuation of the firm's, so the governance page's
promise that the broker values the account still holds.

`supabase/schema.sql` models the relationship and deliberately stores no
figures; a test rejects balance, equity and valuation columns. A live $KJC
either reads the broker on each request, or needs a snapshots table, which
means relaxing that guard on purpose. Nothing reads the schema's tables yet:

- `clients` — one row per enquiry or client. The contact and portal pages
  describe the first steps: an enquiry, a client agreement issued, the
  account opened in the client's name, with portal credentials issued then
  and not before (a check holds that). Active, paused, ended and declined
  are the firm's own record of where the relationship stands; the site does
  not describe them, and whether the firm may pause a relationship is not
  confirmed. US-person status is recorded and refuses nobody: the owner
  withdrew the US-person exclusion on 19 October 2026 (commit `a86dcc6`).
- `broker_accounts` — the client's own account: broker name as free text,
  the last four characters of the account number, base currency, and when the
  authority was granted or revoked. No credential of any kind and no full
  account number.
- `mandates` — the registers and limits the firm may trade under in one
  account, issued under an issued client agreement or amendment. A check
  allows only a `trade_only` authority scope. Terms are fixed once issued,
  and an issued mandate cannot go back to draft; an amendment is a new
  mandate that supersedes the old one.
- `mandate_activity` — append-only log of what the firm did under an issued
  mandate: a kind, a summary and a broker reference, never a price, quantity
  or P&L.
- `fee_charges` — the amount charged for a period, the agreement clause it
  rests on, and the broker statement line that matches it, which is required
  before a charge can be marked paid. No rate and no basis, and no assumption
  that the fee is invoiced, since how it is collected is not stated. Fixed
  once paid, waived or void; never deleted.
- `documents` (fixed once issued, except that a missing signature date may
  be filled in), `notices` with `notice_acknowledgements`, and `desk_notes`
  (readable only by active clients, once published).
- `kyc_checks` — the identity, address, source of funds and tax residence
  checks the privacy page lists, plus the US-person determination. No regime
  is named.

`src/lib/audit.js` names its actions on the same model, its client lifecycle
actions after the `client_status` each one moves to. Neither file has a
table, column or action for units, shares, NAV, subscriptions, redemptions, a
balance or a valuation. The tests read `CREATE TABLE` and `ALTER TABLE ...
ADD` columns, enum labels and action names, and fail if one appears; they
also fail on any statement the parser does not read, such as a policy or
grant run from a `DO` block, so a guard cannot be stepped round by changing
the form.

One scaffold remnant is outside the data model: `.env.local.example` still
sets `NEXT_PUBLIC_FUND_NAME` and a "single house terminal" block
(`BROKER_ENC_KEY`, `BROKER_LOGIN`, `BROKER_SERVER`, `MT5_SYNC_SHARED_SECRET`)
that assumes the firm holds one MT5 password and ingests trades from it.
Nothing in `src` reads any of them, and they describe the opposite of the
model above. `scripts/test-setup.mjs` and `scripts/scan-secrets.mjs` still
name two of them. Remove them rather than build on them.

## Portal

`/[lang]/portal` opens straight onto the client dashboard. There is no login:
the owner set it aside, and a sign-in built for Supabase was removed (it is in
commit 4af2311 if wanted back). The page is public.

**Live figures come from Keystone Monitor**, the owner's MT5 tracker (a separate
Supabase project). `src/lib/keystone.js` calls one read-only
function there, `site_feed('kjc')`, defined in `supabase/keystone/site_feed.sql`.
It returns the percentage gain now, at the end of each day equity was
sampled, and at each equity sample in the 24 hours up to the latest one,
for the single account named in Keystone's `site_feeds` allow list
(the 500k V100 account, chosen by the owner's worked example). Nothing else
leaves Keystone: no money figure, account number, server, broker, symbol or
position. The page rebuilds at most once a minute.

It needs two server-side environment variables in Vercel, `KEYSTONE_URL` and
`KEYSTONE_PUBLISHABLE_KEY` (Keystone's publishable key, which is public by
design; both are set), and the SQL above applied to Keystone. The page has
three modes, chosen in order, and the board's status light says which:

- **live**: the feed answered. The $KJC board polls `/api/kjc` once a minute,
  flashes whatever moved and adds the reading to the end of the trend, so a
  visitor sees it change without reloading.
- **snapshot**: no live feed, so the page shows `src/lib/keystoneSnapshot.json`,
  the same feed read once from Keystone and committed; the status reads
  "Snapshot" with the time it was taken. Refresh it by re-running the feed
  query against Keystone and replacing the file.
- **example**: only if the snapshot is missing too; the invented account in
  `src/lib/portalExample.js`, with the status reading "Example account".

The owner removed the notice box that used to sit above the board, so the
status light is the only label; `tests/portal.test.mjs` fails if the board
stops rendering it in any mode. The sections still
made up (registers, activity, fees, documents, notices, desk note) carry an
Example tag in every mode. Because the page is public, whatever account the
feed names is public.

The **$KJC board** (`src/components/portal/KjcBoard.jsx`) is the one dark band
on the site: `$KJC`, the status light, the figure itself, large, green
with an up arrow or red with a down arrow, and its trend underneath. The owner
had the moving tape and the "Your return" label taken off, then asked for a
live trend in their place. **It shows the percentage gain and nothing
else**: the
owner's call. No balance, deposit, profit or drawdown figure is on the board,
in `/api/kjc`, in the props the page hands the browser, in the committed
snapshot, or in what Keystone's function returns; `tests/portal.test.mjs`
and `tests/keystone.test.mjs` hold that line. The history chart below the
board appears once there are two days of $KJC to draw.

The **trend** (`src/components/portal/KjcTrend.jsx`, maths in
`src/lib/trend.js`) draws the day's equity samples, about one every 16
minutes, as straight segments from reading to reading, so it zig-zags like a
price chart rather than smoothing the moves away; `tests/trend.test.mjs`
fails if the path ever gains a curve. It ends on the headline figure, its
axes are percentages and UTC times, and hovering reads off any point. When
live it grows by one reading a minute and keeps the last 24 hours. Without
intraday samples it falls back to the daily (or, for the example, monthly)
history.

**$KJC** (`src/lib/kjc.js`) is the client's return measured on equity:

    $KJC = (equity - net deposits) / net deposits

Closed profit counts and so does any loss still open, so a client who has
banked 50,000 on 500,000 but carries 25,000 of open drawdown sees +5.00%, not
the +10.00% the balance would show. The inputs are the fields an MT5 account
reports (balance, equity, and deposits less withdrawals from its balance
operations), so a live feed can replace the example without the page changing.
The page shows the figure alone. $KJC history needs equity, so the chart only
has points from the day Keystone began sampling it.

The rest of the page is the mandate's two rules (trade-only authority, and the
account in the client's name), each register's weight against its limit
(forex at the core with stocks alongside, as the owner set it), the activity
log, fees, documents, notices and a desk note. Two rules the owner set:

- **Activity never shows a trade.** No order, position, entry, exit or profit
  taken; it is the account's administration (statements, limit checks,
  reviews, fees, notices). When it is built from the schema's
  `mandate_activity`, instruction entries are left out of the client's view.
- **The desk note is about the news**, not about what the desk did.

`tests/portal.test.mjs` checks both against a list of trading words.

The home and programme pages still describe a gold-led programme across four
registers; the portal's example registers are forex and stocks. Align one to
the other once the owner says which is right.

## Conventions

- Double quotes, semicolons. Match the surrounding file.
- One component per file, PascalCase, `export default function Name()`.
- Server Components by default. `"use client"` only for state, effects, or
  event handlers. Never pass a function as a prop from a server component
  into a client one.
- Supabase clients by context: `client.js` in the browser, `server.js` in
  RSCs and server actions, `admin.js` (service role) only in route handlers.
- Business logic in `src/lib/*.js` with a matching `tests/<name>.test.mjs`.
- Page metadata through `pageMeta` in `src/lib/pageMeta.js`. Next replaces a
  page's `openGraph` and `twitter` rather than merging them, so a hand-built
  block drops the site name, type and locale.
- No em-dashes in visible body copy. `tests/i18n.test.mjs` reads the
  dictionary and every `.jsx` file under `src/app` and `src/components`.
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
- **Fixed once issued.** Issued mandates, issued documents, issued notices
  and settled fee charges are held by trigger too. For a document or notice,
  issued means `issued_at` has come, as the read policies have it, so a
  scheduled notice can still be corrected before any client sees it.
- **The database's clock.** `mandate_activity.recorded_at`,
  `audit_events.occurred_at` and `notice_acknowledgements.acknowledged_at`
  are set on insert whatever the writer sends, and a notice's `issued_at`
  cannot be earlier than when it was set.
- **Secrets stay server-side.** `ops_pin_hashes` and `mfa_backup_codes` have
  no policy: a six-digit PIN's hash and salt in a browser session could be
  brute-forced offline.
- **Authority.** `mandates.authority_scope` is checked to be `trade_only`,
  because the governance and disclosures pages say so. If the real authority
  is broader, those pages are corrected first and the check after.
- **Retention.** As written, nothing removes a client's records: every
  `client_id` is `on delete restrict` and the tables above refuse deletion.
  How long records must be kept is not confirmed. Once it is, removing a
  client whose period has run is a deliberate manual job: disable the
  triggers on the tables concerned, delete in dependency order, and enable
  them again.

The schema replaces a pooled-fund draft (`investors`, `nav_strikes`,
`subscriptions`, `redemptions`, `units_ledger`, `high_water_marks`). That draft
was never applied to any project, and the file drops nothing. If it was ever
applied somewhere, drop those tables and their enum types by hand.

CI has no Postgres, so `tests/schema.test.mjs` parses the file. What a parse
cannot show is behaviour: two clients isolated from each other in every table,
the triggers firing, the authority and credential checks refusing a row. That
was exercised against PostgreSQL 16, with Supabase's roles and `auth.uid()`
stubbed, when this model was written and again when it was corrected. Do it
again after any change to the schema.
