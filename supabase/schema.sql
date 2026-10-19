-- KJC Capital — portal schema: managed accounts, not a fund.
--
-- The firm manages each client's own broker account under a limited trading
-- authority. The account is opened with a broker in the client's name and
-- under the client's own credentials. Nothing is pooled and the firm never
-- holds client money, so there are no units, no NAV, no subscriptions or
-- redemptions, and nothing for the firm to value.
--
-- This is the record of the relationship, not of the money: who the client
-- is, which account the firm may trade and within what limits, what it did
-- under that authority, the documents, the fees charged and the broker
-- statement line that matches each one, the notices the firm gives, and the
-- desk note. Balances, positions, trades, prices, P&L and valuations are not
-- stored here and must not be added. They stay with the broker, whose
-- statement is authoritative, and a second set of numbers would break the
-- programme page's promise that there is no version of the account only the
-- firm can see. tests/schema.test.mjs fails on columns that look like them.
--
-- Applied by hand in the Supabase SQL editor. Written to be re-runnable:
-- every CREATE TABLE and CREATE INDEX is IF NOT EXISTS, every enum is guarded
-- by DO $$ ... $$, every policy and trigger is dropped if it exists before it
-- is created, and every function is CREATE OR REPLACE.
--
-- This replaces a pooled-fund draft (investors, nav_strikes, subscriptions,
-- redemptions, units_ledger, high_water_marks and their enums). That draft
-- was never applied to any project. If it ever was, drop those tables and
-- types by hand; this file deliberately drops nothing.
--
-- Row-level security is enabled on every table. Supabase grants the anon and
-- authenticated roles table privileges by default and leaves RLS to gate
-- them. The only policies here are SELECT policies for authenticated users,
-- each limited to rows the caller is entitled to; there is no INSERT, UPDATE
-- or DELETE policy for any role. Every write goes through the service-role
-- client from server code, which bypasses RLS. The write privileges are also
-- revoked from anon and authenticated at the end of the file.
--
-- Client rows are never deleted while anything refers to them (every
-- client_id is ON DELETE RESTRICT): records outlive the relationship for as
-- long as the applicable anti-money-laundering framework requires.

set search_path = public;

-- ---------------------------------------------------------------------------
-- Enumerations.
-- ---------------------------------------------------------------------------

-- The relationship as the contact and portal pages describe it: an enquiry
-- to a director, a client agreement issued if both sides consider it a fit,
-- the account opened in the client's own name (portal credentials are issued
-- here), then the programme running. Paused and ended are the firm's record
-- of a stop; declined closes an enquiry that did not proceed.
do $$ begin
  create type client_status as enum ('enquiry', 'agreement_issued', 'account_opening', 'active', 'paused', 'ended', 'declined');
exception when duplicate_object then null; end $$;

-- opening: the client is opening the account with the broker.
-- open: the account exists and no authority has been granted yet.
-- authorised: the client has granted the firm its trading authority.
-- revoked: the client has withdrawn that authority with the broker.
-- closed: the client has closed the account.
do $$ begin
  create type broker_account_status as enum ('opening', 'open', 'authorised', 'revoked', 'closed');
exception when duplicate_object then null; end $$;

-- The programme's four registers, as the site names them.
do $$ begin
  create type programme_register as enum ('precious_metals', 'algorithmic_strategies', 'digital_assets', 'select_alternatives');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mandate_status as enum ('draft', 'active', 'superseded', 'ended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mandate_activity_kind as enum ('instruction_placed', 'limit_change', 'authority_change', 'risk_event', 'client_communication', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_kind as enum ('client_agreement', 'agreement_amendment', 'trading_authority', 'identity_record', 'fee_invoice', 'notice', 'disclosure', 'correspondence', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fee_charge_status as enum ('invoiced', 'paid', 'waived', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notice_kind as enum ('mandate_change', 'fee_change', 'risk_event', 'service_change', 'regulatory', 'other');
exception when duplicate_object then null; end $$;

-- The checks the privacy notice says the firm makes (identity, address,
-- source of funds, tax residence), plus the US-person determination the site
-- depends on. No regime is named, because which anti-money-laundering
-- framework applies to the firm is not confirmed.
do $$ begin
  create type kyc_check_kind as enum ('identity', 'address', 'source_of_funds', 'tax_residence', 'us_person');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kyc_check_outcome as enum ('pending', 'passed', 'failed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Trigger functions. Each pins search_path, so none can be redirected by the
-- caller's own path. None is SECURITY DEFINER: each runs as whoever made the
-- change, which for every write is the service role.
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Append-only tables raise on UPDATE, DELETE and TRUNCATE. RLS does not bind
-- the service role and a revoked privilege does not bind the table owner; a
-- trigger binds both, so the record cannot be rewritten by the code that
-- writes it. The owner could still disable the trigger, but only deliberately
-- and visibly. Correcting an entry means appending another that says so.
create or replace function forbid_change() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op
    using hint = 'Append a correcting entry instead.';
end;
$$;

-- A mandate's terms do not change once it has left draft. An amendment is a
-- new mandate that supersedes the old one, so the limits that applied on any
-- given day can always be read back. Only the status and end date of an
-- issued mandate move, and a superseded or ended mandate does not move at all.
create or replace function freeze_mandate_terms() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'draft' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'mandate % has been issued and cannot be deleted', old.id;
  end if;
  if new.client_id is distinct from old.client_id
    or new.broker_account_id is distinct from old.broker_account_id
    or new.registers is distinct from old.registers
    or new.limits is distinct from old.limits
    or new.authority_scope is distinct from old.authority_scope
    or new.agreement_document_id is distinct from old.agreement_document_id
    or new.supersedes_id is distinct from old.supersedes_id
    or new.effective_from is distinct from old.effective_from
  then
    raise exception 'mandate % has been issued and its terms are fixed', old.id
      using hint = 'Issue a new mandate that supersedes it.';
  end if;
  if old.status in ('superseded', 'ended')
    and (new.status, new.effective_to) is distinct from (old.status, old.effective_to)
  then
    raise exception 'mandate % is % and cannot change', old.id, old.status;
  end if;
  return new;
end;
$$;

-- A notice that has been issued is not edited or withdrawn. A correction is a
-- further notice, so the client's record shows both.
create or replace function freeze_issued_notice() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.issued_at is not null then
    raise exception 'notice % has been issued and cannot change', old.id
      using hint = 'Issue a further notice.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- An acknowledgement must be of a notice that had been issued, by a client it
-- was addressed to: that client alone, or every client.
create or replace function check_notice_acknowledgement() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.notices n
    where n.id = new.notice_id
      and n.issued_at <= new.acknowledged_at
      and (n.client_id is null or n.client_id = new.client_id)
  ) then
    raise exception 'notice % was not issued to client %', new.notice_id, new.client_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Clients. One row per person who has enquired or been taken on. The client
-- can read their own row, so it carries no internal notes: the firm's
-- working notes do not belong in a table the client reads.
-- ---------------------------------------------------------------------------

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  -- Set when portal credentials are issued, which is on account opening.
  auth_user_id uuid unique references auth.users(id) on delete set null,
  legal_name text not null check (length(btrim(legal_name)) > 0),
  email text not null,
  -- ISO 3166-1 alpha-2. May be unknown at enquiry; required from then on.
  country_of_residence text check (country_of_residence ~ '^[A-Z]{2}$'),
  status client_status not null default 'enquiry',
  -- No default: nobody is entered without the question having been asked.
  -- The check that settles it is recorded as a us_person row in kyc_checks.
  us_person boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The firm does not accept US persons. A US person can be on record only as
  -- an enquiry, a decline, or a relationship that has ended; never while an
  -- agreement is in issue or an account is being opened, traded or paused.
  constraint clients_no_us_persons check (
    not us_person or status in ('enquiry', 'declined', 'ended')
  ),
  -- A resident of the United States is a US person on any reading.
  constraint clients_us_resident_is_us_person check (
    country_of_residence is distinct from 'US' or us_person
  ),
  constraint clients_residence_known check (
    country_of_residence is not null or status in ('enquiry', 'declined')
  )
);

create unique index if not exists clients_email_key on clients (lower(email));
create index if not exists clients_status_idx on clients (status);

alter table clients enable row level security;

drop trigger if exists clients_updated_at on clients;
create trigger clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Broker accounts. The client's own account, held in the client's name with
-- a broker the client contracts with directly. Which broker is not yet
-- confirmed, so the name is free text rather than an enum.
--
-- This table holds no credential of any kind: no password, no API key, no
-- token, no login, and no full account number. The account is opened under
-- the client's own credentials and the firm never holds them. Only the last
-- four characters of the account number are kept, enough for a client to
-- recognise which account a row means. Do not add a column for any of those
-- things; tests/schema.test.mjs fails if one appears.
-- ---------------------------------------------------------------------------

create table if not exists broker_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  broker_name text not null check (length(btrim(broker_name)) > 0),
  account_last4 text not null check (account_last4 ~ '^[A-Za-z0-9]{4}$'),
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  status broker_account_status not null default 'opening',
  -- When the firm recorded the grant and the revocation. The client revokes
  -- directly with the broker and need not tell us first, so the broker's own
  -- record of when it took effect is the authoritative one.
  authority_granted_at timestamptz,
  authority_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id),
  constraint broker_accounts_authorised_has_grant check (
    status <> 'authorised' or (authority_granted_at is not null and authority_revoked_at is null)
  ),
  constraint broker_accounts_revoked_has_revocation check (
    status <> 'revoked' or (authority_granted_at is not null and authority_revoked_at is not null)
  ),
  constraint broker_accounts_revoked_after_granted check (
    authority_revoked_at is null or authority_revoked_at >= authority_granted_at
  )
);

create index if not exists broker_accounts_client_idx on broker_accounts (client_id);

alter table broker_accounts enable row level security;

drop trigger if exists broker_accounts_updated_at on broker_accounts;
create trigger broker_accounts_updated_at
  before update on broker_accounts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Documents. Files in Supabase Storage. The bucket must be private; a file
-- reaches a client only through a short-lived signed URL issued by server
-- code. client_id is null only for a document issued to every client alike,
-- such as a revised disclosure. Broker statements are not kept here: they
-- are the broker's, and the client already has them.
-- ---------------------------------------------------------------------------

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete restrict,
  kind document_kind not null,
  title text not null check (length(btrim(title)) > 0),
  -- A path inside the bucket, never a URL.
  storage_path text not null unique check (storage_path !~ '^[A-Za-z][A-Za-z0-9+.-]*://'),
  -- When the document was issued to, or received from, the client. Until
  -- then it is a draft and the client cannot see it.
  issued_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id),
  constraint documents_firm_wide_kinds check (
    client_id is not null or kind in ('disclosure', 'notice', 'other')
  )
);

create index if not exists documents_client_idx on documents (client_id, issued_at desc);

alter table documents enable row level security;

drop trigger if exists documents_updated_at on documents;
create trigger documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Mandates. What the firm is authorised to do in one broker account: which
-- registers it may trade, within what limits, from when, and under which
-- client agreement. Once issued, the portal shows the client exactly what is
-- stored.
-- ---------------------------------------------------------------------------

create table if not exists mandates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  broker_account_id uuid not null,
  registers programme_register[] not null check (cardinality(registers) > 0),
  -- The limits as the client agreement states them, shown verbatim. jsonb
  -- because the agreement's terms are not settled and no structure for them
  -- is confirmed. It holds limits, never positions or results.
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object'),
  -- The governance and disclosures pages promise that the firm can place
  -- trades and nothing else: it cannot withdraw, transfer or pledge a
  -- client's assets. The database holds the firm to that, and trade_only is
  -- the only scope it accepts. Whether the authority granted at the broker is
  -- genuinely this narrow is still unconfirmed. If it is broader, the
  -- governance and disclosures pages must be corrected first, and only then
  -- this check.
  authority_scope text not null default 'trade_only',
  agreement_document_id uuid,
  supersedes_id uuid,
  effective_from timestamptz not null,
  effective_to timestamptz,
  status mandate_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id),
  constraint mandates_authority_trade_only check (authority_scope = 'trade_only'),
  -- The account, the agreement and any mandate superseded are this client's.
  foreign key (broker_account_id, client_id) references broker_accounts (id, client_id) on delete restrict,
  foreign key (agreement_document_id, client_id) references documents (id, client_id) on delete restrict,
  foreign key (supersedes_id, client_id) references mandates (id, client_id) on delete restrict,
  constraint mandates_issued_under_agreement check (status = 'draft' or agreement_document_id is not null),
  constraint mandates_effective_order check (effective_to is null or effective_to > effective_from)
);

create index if not exists mandates_client_idx on mandates (client_id);
create index if not exists mandates_broker_account_idx on mandates (broker_account_id, client_id);
create index if not exists mandates_agreement_idx on mandates (agreement_document_id);
create index if not exists mandates_supersedes_idx on mandates (supersedes_id);
create unique index if not exists mandates_one_active_per_account on mandates (broker_account_id) where status = 'active';

alter table mandates enable row level security;

drop trigger if exists mandates_freeze_terms on mandates;
create trigger mandates_freeze_terms
  before update or delete on mandates
  for each row execute function freeze_mandate_terms();

drop trigger if exists mandates_updated_at on mandates;
create trigger mandates_updated_at
  before update on mandates
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Mandate activity. The log of every material thing the firm did under a
-- mandate, which the governance page promises is kept, timestamped and
-- retained, and which the client reads in the portal. Append-only.
--
-- It is a log of conduct, not a trade blotter: there is no price, quantity,
-- fill or P&L column, and there must not be. Those are on the broker's
-- statement, and broker_reference is how a client finds the matching entry.
-- ---------------------------------------------------------------------------

create table if not exists mandate_activity (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  mandate_id uuid not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  kind mandate_activity_kind not null,
  summary text not null check (length(btrim(summary)) > 0),
  broker_reference text,
  foreign key (mandate_id, client_id) references mandates (id, client_id) on delete restrict
);

create index if not exists mandate_activity_client_idx on mandate_activity (client_id, occurred_at desc);
create index if not exists mandate_activity_mandate_idx on mandate_activity (mandate_id, client_id);

alter table mandate_activity enable row level security;

drop trigger if exists mandate_activity_append_only on mandate_activity;
create trigger mandate_activity_append_only
  before update or delete on mandate_activity
  for each row execute function forbid_change();

drop trigger if exists mandate_activity_no_truncate on mandate_activity;
create trigger mandate_activity_no_truncate
  before truncate on mandate_activity
  for each statement execute function forbid_change();

-- ---------------------------------------------------------------------------
-- Fee charges. What the firm charged a client for a period. The basis of the
-- fee lives in the client agreement and nowhere else: a row names the clause
-- it rests on and stores no rate, percentage or threshold, because the fee
-- basis is not confirmed and the site defers to the agreement.
--
-- The firm has no authority to move money out of an account, so it never
-- deducts a fee itself. A charge can be recorded before it reaches a broker
-- statement, so the reference may be empty while it is invoiced, waived or
-- void; it cannot be marked paid without the line on the broker statement
-- that matches it, which is what the portal shows beside it.
-- ---------------------------------------------------------------------------

create table if not exists fee_charges (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  broker_account_id uuid not null,
  period_start date not null,
  period_end date not null,
  amount numeric(20, 2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  agreement_clause text not null check (length(btrim(agreement_clause)) > 0),
  invoice_document_id uuid,
  broker_statement_reference text,
  status fee_charge_status not null default 'invoiced',
  invoiced_at timestamptz not null default now(),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (broker_account_id, client_id) references broker_accounts (id, client_id) on delete restrict,
  foreign key (invoice_document_id, client_id) references documents (id, client_id) on delete restrict,
  constraint fee_charges_period_order check (period_end >= period_start),
  constraint fee_charges_paid_matches_statement check (
    status <> 'paid'
    or (paid_at is not null and length(btrim(coalesce(broker_statement_reference, ''))) > 0)
  )
);

create index if not exists fee_charges_client_idx on fee_charges (client_id, period_start desc);
create index if not exists fee_charges_broker_account_idx on fee_charges (broker_account_id, client_id);
create index if not exists fee_charges_invoice_idx on fee_charges (invoice_document_id);

alter table fee_charges enable row level security;

drop trigger if exists fee_charges_updated_at on fee_charges;
create trigger fee_charges_updated_at
  before update on fee_charges
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Notices. What the firm is obliged to tell a client, addressed to one
-- client or, with client_id null, to every client. Visible once issued, and
-- fixed from then on.
-- ---------------------------------------------------------------------------

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete restrict,
  kind notice_kind not null,
  title text not null check (length(btrim(title)) > 0),
  body text not null check (length(btrim(body)) > 0),
  requires_acknowledgement boolean not null default false,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notices_client_idx on notices (client_id, issued_at desc);

alter table notices enable row level security;

drop trigger if exists notices_freeze_issued on notices;
create trigger notices_freeze_issued
  before update or delete on notices
  for each row execute function freeze_issued_notice();

drop trigger if exists notices_updated_at on notices;
create trigger notices_updated_at
  before update on notices
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Notice acknowledgements. One row per client per notice they acknowledged,
-- recorded by server code on the client's behalf. Append-only: it is the
-- firm's evidence that a notice was received.
-- ---------------------------------------------------------------------------

create table if not exists notice_acknowledgements (
  notice_id uuid not null references notices(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  acknowledged_at timestamptz not null default now(),
  primary key (notice_id, client_id)
);

create index if not exists notice_acknowledgements_client_idx on notice_acknowledgements (client_id);

alter table notice_acknowledgements enable row level security;

drop trigger if exists notice_acknowledgements_addressee on notice_acknowledgements;
create trigger notice_acknowledgements_addressee
  before insert on notice_acknowledgements
  for each row execute function check_notice_acknowledgement();

drop trigger if exists notice_acknowledgements_append_only on notice_acknowledgements;
create trigger notice_acknowledgements_append_only
  before update or delete on notice_acknowledgements
  for each row execute function forbid_change();

drop trigger if exists notice_acknowledgements_no_truncate on notice_acknowledgements;
create trigger notice_acknowledgements_no_truncate
  before truncate on notice_acknowledgements
  for each statement execute function forbid_change();

-- ---------------------------------------------------------------------------
-- Desk notes. A periodic note from the desk on how the book was being
-- carried, the same for every client. It is prose, not a performance report:
-- each account's numbers are on that account's broker statement. Readable
-- only by clients whose relationship is active, and only once published.
-- ---------------------------------------------------------------------------

create table if not exists desk_notes (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  title text not null check (length(btrim(title)) > 0),
  body text not null check (length(btrim(body)) > 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint desk_notes_period_order check (period_end >= period_start)
);

create index if not exists desk_notes_published_idx on desk_notes (published_at desc);

alter table desk_notes enable row level security;

drop trigger if exists desk_notes_updated_at on desk_notes;
create trigger desk_notes_updated_at
  before update on desk_notes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- KYC checks. One row per check made on a client, with the document that
-- evidences it. Readable by the client it concerns: it is their own
-- information, and the privacy notice gives them a right to a copy. There is
-- no free-text column for the same reason as on clients.
--
-- Which checks must pass before an account is opened is the firm's
-- procedure, under a framework not yet confirmed, so it is not encoded here.
-- The one rule the database enforces is clients_no_us_persons.
-- ---------------------------------------------------------------------------

create table if not exists kyc_checks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  kind kyc_check_kind not null,
  outcome kyc_check_outcome not null default 'pending',
  checked_at timestamptz,
  evidence_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (evidence_document_id, client_id) references documents (id, client_id) on delete restrict,
  constraint kyc_checks_decided_when check (outcome = 'pending' or checked_at is not null)
);

create index if not exists kyc_checks_client_idx on kyc_checks (client_id, kind);
create index if not exists kyc_checks_evidence_idx on kyc_checks (evidence_document_id);

alter table kyc_checks enable row level security;

drop trigger if exists kyc_checks_updated_at on kyc_checks;
create trigger kyc_checks_updated_at
  before update on kyc_checks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Ops PIN hashes. Per-user PBKDF2 hash of the six-digit ops PIN. Verified
-- fresh on every visit to a PIN-guarded page.
-- ---------------------------------------------------------------------------

create table if not exists ops_pin_hashes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  pin_salt text not null,
  updated_at timestamptz not null default now()
);

alter table ops_pin_hashes enable row level security;

-- ---------------------------------------------------------------------------
-- MFA backup codes. Per-user, one-time use. Stored hashed.
-- ---------------------------------------------------------------------------

create table if not exists mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mfa_backup_codes_user_idx on mfa_backup_codes (user_id);

alter table mfa_backup_codes enable row level security;

-- ---------------------------------------------------------------------------
-- Audit events. Append-only record of every ops action, credential change,
-- change to a client, account, authority or mandate, fee decision, notice,
-- and 2FA change.
--
-- Written from server code with the service-role client. Never mutated: the
-- triggers below refuse UPDATE, DELETE and TRUNCATE from every role,
-- including the service role. One consequence is that the ON DELETE SET NULL
-- on actor_user_id can no longer fire, since it is an update, so an auth user
-- who appears in the trail cannot be deleted. Ban them in Supabase Auth
-- instead. A trail that forgot who acted would not be worth keeping.
-- ---------------------------------------------------------------------------

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  actor_ip inet,
  action text not null,
  target_kind text,
  target_id text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb
);

create index if not exists audit_events_occurred_idx on audit_events (occurred_at desc);
create index if not exists audit_events_actor_idx on audit_events (actor_user_id, occurred_at desc);
create index if not exists audit_events_target_idx on audit_events (target_kind, target_id);

alter table audit_events enable row level security;

drop trigger if exists audit_events_append_only on audit_events;
create trigger audit_events_append_only
  before update or delete on audit_events
  for each row execute function forbid_change();

drop trigger if exists audit_events_no_truncate on audit_events;
create trigger audit_events_no_truncate
  before truncate on audit_events
  for each statement execute function forbid_change();

-- No policies on audit_events. Only the service-role client writes; nothing
-- reads through the anon/authenticated roles. Ops reads go through a
-- server-side route that itself checks the caller's role first.

-- ---------------------------------------------------------------------------
-- Read policies. Every policy is FOR SELECT TO authenticated, so anon reads
-- nothing at all. A client reads their own rows, found through
-- clients.auth_user_id; portal credentials are issued only on account
-- opening, so having a clients row is what makes an authenticated user a
-- client. auth.uid() is wrapped in a sub-select so Postgres evaluates it once
-- per query rather than once per row.
-- ---------------------------------------------------------------------------

drop policy if exists clients_self_read on clients;
create policy clients_self_read on clients
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()));

drop policy if exists broker_accounts_self_read on broker_accounts;
create policy broker_accounts_self_read on broker_accounts
  for select
  to authenticated
  using (
    client_id in (select id from clients where auth_user_id = (select auth.uid()))
  );

-- A draft mandate is not shown; the client sees the proposed terms in the
-- client agreement until the mandate is issued.
drop policy if exists mandates_self_read on mandates;
create policy mandates_self_read on mandates
  for select
  to authenticated
  using (
    status <> 'draft'
    and client_id in (select id from clients where auth_user_id = (select auth.uid()))
  );

drop policy if exists mandate_activity_self_read on mandate_activity;
create policy mandate_activity_self_read on mandate_activity
  for select
  to authenticated
  using (
    client_id in (select id from clients where auth_user_id = (select auth.uid()))
  );

drop policy if exists fee_charges_self_read on fee_charges;
create policy fee_charges_self_read on fee_charges
  for select
  to authenticated
  using (
    client_id in (select id from clients where auth_user_id = (select auth.uid()))
  );

drop policy if exists kyc_checks_self_read on kyc_checks;
create policy kyc_checks_self_read on kyc_checks
  for select
  to authenticated
  using (
    client_id in (select id from clients where auth_user_id = (select auth.uid()))
  );

drop policy if exists notice_acknowledgements_self_read on notice_acknowledgements;
create policy notice_acknowledgements_self_read on notice_acknowledgements
  for select
  to authenticated
  using (
    client_id in (select id from clients where auth_user_id = (select auth.uid()))
  );

-- Documents and notices: the client's own once issued, and those issued to
-- every client.
drop policy if exists documents_self_read on documents;
create policy documents_self_read on documents
  for select
  to authenticated
  using (
    issued_at <= now()
    and (
      client_id in (select id from clients where auth_user_id = (select auth.uid()))
      or (client_id is null and exists (select 1 from clients where auth_user_id = (select auth.uid())))
    )
  );

drop policy if exists notices_self_read on notices;
create policy notices_self_read on notices
  for select
  to authenticated
  using (
    issued_at <= now()
    and (
      client_id in (select id from clients where auth_user_id = (select auth.uid()))
      or (client_id is null and exists (select 1 from clients where auth_user_id = (select auth.uid())))
    )
  );

drop policy if exists desk_notes_active_client_read on desk_notes;
create policy desk_notes_active_client_read on desk_notes
  for select
  to authenticated
  using (
    published_at <= now()
    and exists (
      select 1 from clients where auth_user_id = (select auth.uid()) and status = 'active'
    )
  );

-- Ops PIN hashes and MFA backup codes: the authenticated user reads only
-- their own row (write is service-role only).

drop policy if exists ops_pin_hashes_self_read on ops_pin_hashes;
create policy ops_pin_hashes_self_read on ops_pin_hashes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists mfa_backup_codes_self_read on mfa_backup_codes;
create policy mfa_backup_codes_self_read on mfa_backup_codes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Write privileges. Revoked from anon and authenticated on every table, so a
-- policy added carelessly later still cannot open a table to writes from a
-- browser, and so TRUNCATE, which RLS does not cover, is closed too. The
-- service role keeps its grants and is the only writer.
-- ---------------------------------------------------------------------------

revoke insert, update, delete, truncate on table
  clients,
  broker_accounts,
  documents,
  mandates,
  mandate_activity,
  fee_charges,
  notices,
  notice_acknowledgements,
  desk_notes,
  kyc_checks,
  ops_pin_hashes,
  mfa_backup_codes,
  audit_events
  from anon, authenticated;
