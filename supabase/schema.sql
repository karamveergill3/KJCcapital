-- KJC Capital — Phase 1 schema.
--
-- Applied by hand in the Supabase SQL editor. Written to be re-runnable:
-- every CREATE TABLE is IF NOT EXISTS, every policy uses DROP POLICY IF EXISTS
-- before CREATE POLICY, every enum is guarded by DO $$ ... $$.
--
-- Row-level security is enabled on every table. Only the service-role key
-- bypasses RLS. The anon and authenticated roles have no direct SELECT/INSERT
-- rights on any table in this schema; investor-facing reads go through the
-- server, which uses the authenticated user's JWT and matches on investor_id.

set search_path = public;

-- ---------------------------------------------------------------------------
-- Enumerations.
-- ---------------------------------------------------------------------------

do $$ begin
  create type investor_status as enum ('prospect', 'onboarding', 'active', 'redeeming', 'redeemed', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('pending', 'funds_received', 'settled', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type redemption_status as enum ('requested', 'in_notice', 'settled', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ledger_kind as enum ('subscription', 'redemption', 'management_fee', 'performance_fee', 'nav_restrike');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Investors. One row per admitted or prospective investor.
-- ---------------------------------------------------------------------------

create table if not exists investors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  legal_name text not null,
  email text not null unique,
  country text,
  status investor_status not null default 'prospect',
  admitted_at timestamptz,
  suspended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investors_status_idx on investors (status);

alter table investors enable row level security;

-- ---------------------------------------------------------------------------
-- NAV strikes. First business day of each month. Immutable once written.
-- ---------------------------------------------------------------------------

create table if not exists nav_strikes (
  id uuid primary key default gen_random_uuid(),
  strike_date date not null unique,
  fund_nav_usd numeric(20, 2) not null,
  units_outstanding numeric(20, 8) not null,
  nav_per_unit numeric(20, 8) generated always as (
    case when units_outstanding = 0 then null else fund_nav_usd / units_outstanding end
  ) stored,
  struck_by uuid references auth.users(id) on delete set null,
  struck_at timestamptz not null default now(),
  method_notes text
);

create index if not exists nav_strikes_date_idx on nav_strikes (strike_date desc);

alter table nav_strikes enable row level security;

-- ---------------------------------------------------------------------------
-- Subscriptions. A request to invest; issues units at the next NAV strike.
-- ---------------------------------------------------------------------------

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investors(id) on delete restrict,
  amount_usd numeric(20, 2) not null check (amount_usd >= 20000),
  status subscription_status not null default 'pending',
  funds_received_at timestamptz,
  settled_at timestamptz,
  settled_nav_strike_id uuid references nav_strikes(id) on delete set null,
  units_issued numeric(20, 8),
  wire_reference text,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_investor_idx on subscriptions (investor_id);
create index if not exists subscriptions_status_idx on subscriptions (status);

alter table subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- Redemptions. A request to redeem; settled at the NAV strike following
-- the notice period.
-- ---------------------------------------------------------------------------

create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investors(id) on delete restrict,
  units_to_redeem numeric(20, 8),
  redeem_all boolean not null default false,
  status redemption_status not null default 'requested',
  notice_starts_at timestamptz not null default now(),
  earliest_settle_date date not null,
  settled_at timestamptz,
  settled_nav_strike_id uuid references nav_strikes(id) on delete set null,
  amount_paid_usd numeric(20, 2),
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now()
);

create index if not exists redemptions_investor_idx on redemptions (investor_id);
create index if not exists redemptions_status_idx on redemptions (status);

alter table redemptions enable row level security;

-- ---------------------------------------------------------------------------
-- Units ledger. Append-only per-investor movements of units. Positive on
-- subscription, negative on redemption.
-- ---------------------------------------------------------------------------

create table if not exists units_ledger (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investors(id) on delete restrict,
  kind ledger_kind not null,
  units_delta numeric(20, 8) not null,
  nav_strike_id uuid references nav_strikes(id) on delete set null,
  subscription_id uuid references subscriptions(id) on delete set null,
  redemption_id uuid references redemptions(id) on delete set null,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists units_ledger_investor_idx on units_ledger (investor_id, created_at desc);

alter table units_ledger enable row level security;

-- ---------------------------------------------------------------------------
-- High-water marks. Per-investor, updated at each quarterly performance-fee
-- crystallisation.
-- ---------------------------------------------------------------------------

create table if not exists high_water_marks (
  investor_id uuid primary key references investors(id) on delete cascade,
  hwm_nav_per_unit numeric(20, 8) not null,
  set_at timestamptz not null default now()
);

alter table high_water_marks enable row level security;

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
-- subscription decision, redemption decision, and 2FA change.
--
-- Written from server code with the service-role client. Never mutated.
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

-- No policies on audit_events. Only the service-role client writes; nothing
-- reads through the anon/authenticated roles. Ops reads go through a
-- server-side route that itself checks the caller's role first.

-- ---------------------------------------------------------------------------
-- Investor-scoped read policies.
-- ---------------------------------------------------------------------------

drop policy if exists investors_self_read on investors;
create policy investors_self_read on investors
  for select
  using (auth_user_id = auth.uid());

drop policy if exists subscriptions_self_read on subscriptions;
create policy subscriptions_self_read on subscriptions
  for select
  using (
    investor_id in (select id from investors where auth_user_id = auth.uid())
  );

drop policy if exists redemptions_self_read on redemptions;
create policy redemptions_self_read on redemptions
  for select
  using (
    investor_id in (select id from investors where auth_user_id = auth.uid())
  );

drop policy if exists units_ledger_self_read on units_ledger;
create policy units_ledger_self_read on units_ledger
  for select
  using (
    investor_id in (select id from investors where auth_user_id = auth.uid())
  );

-- Nav strikes are readable by any authenticated user (an investor needs the
-- current NAV to see their own balance). Fund-level detail is not exposed
-- beyond nav_per_unit and strike_date.

drop policy if exists nav_strikes_authenticated_read on nav_strikes;
create policy nav_strikes_authenticated_read on nav_strikes
  for select
  to authenticated
  using (true);

-- Ops PIN hashes and MFA backup codes: the authenticated user reads only
-- their own row (write is service-role only).

drop policy if exists ops_pin_hashes_self_read on ops_pin_hashes;
create policy ops_pin_hashes_self_read on ops_pin_hashes
  for select
  using (user_id = auth.uid());

drop policy if exists mfa_backup_codes_self_read on mfa_backup_codes;
create policy mfa_backup_codes_self_read on mfa_backup_codes
  for select
  using (user_id = auth.uid());

drop policy if exists high_water_marks_self_read on high_water_marks;
create policy high_water_marks_self_read on high_water_marks
  for select
  using (
    investor_id in (select id from investors where auth_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- updated_at trigger.
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists investors_updated_at on investors;
create trigger investors_updated_at
  before update on investors
  for each row execute function set_updated_at();
