-- Keystone Monitor: a read-only feed for the KJC Capital website.
--
-- Run once in the Keystone Monitor project's SQL editor (not the KJC schema,
-- and not ForexDNA). It adds one table and one function and changes nothing
-- that is already there.
--
-- site_feeds is an allow list: the website can read an account only if it is
-- named here. site_feed(slug) returns that account's aggregates and nothing
-- else: no account number, server, broker, label, symbol, position or deal.
-- It is the only thing the public key can reach; every table stays locked.
--
-- To point the website at a different account, change the row:
--   update public.site_feeds set account_id = (select id from accounts where label = '...') where slug = 'kjc';
-- To disconnect it entirely:
--   drop function public.site_feed(text); drop table public.site_feeds;

create table if not exists public.site_feeds (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,40}$'),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.site_feeds enable row level security;
revoke all on public.site_feeds from anon, authenticated;

create or replace function public.site_feed(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with a as (
    select acc.*
    from site_feeds f
    join accounts acc on acc.id = f.account_id
    where f.slug = p_slug and acc.archived_at is null
  ),
  cash as (
    select coalesce(sum(d.net) filter (where d.net > 0), 0) as deposits,
           coalesce(-sum(d.net) filter (where d.net < 0), 0) as withdrawals,
           min(d.time) as opened_at
    from deals d join a on a.id = d.account_id
    where d.kind = 'cash'
  ),
  days as (
    select ad.day, ad.trade_pnl, ad.cash_flow
    from account_daily ad join a on a.id = ad.account_id
  ),
  eq as (
    select distinct on ((s.at at time zone 'Europe/London')::date)
      (s.at at time zone 'Europe/London')::date as day,
      s.equity - coalesce(s.credit, 0) as equity
    from equity_samples s join a on a.id = s.account_id
    order by (s.at at time zone 'Europe/London')::date, s.at desc
  ),
  all_days as (select day from days union select day from eq),
  daily as (
    select ad.day,
      (select coalesce(sum(x.trade_pnl), 0) from days x where x.day <= ad.day) as closed,
      (select coalesce(sum(x.cash_flow), 0) from days x where x.day <= ad.day) as capital,
      e.equity
    from all_days ad left join eq e on e.day = ad.day
  )
  select case when not exists (select 1 from a) then null else jsonb_build_object(
    'currency', (select currency from a),
    'as_at', (select last_sync_at from a),
    'balance', (select balance from a),
    'equity', (select equity from a),
    'credit', (select coalesce(credit, 0) from a),
    'deposits', (select deposits from cash),
    'withdrawals', (select withdrawals from cash),
    'opened_at', (select opened_at from cash),
    'tracking_since', (select tracking_since from a),
    'daily', coalesce(
      (select jsonb_agg(jsonb_build_object('day', d.day, 'closed', d.closed, 'capital', d.capital, 'equity', d.equity) order by d.day) from daily d),
      '[]'::jsonb
    )
  ) end;
$$;

revoke all on function public.site_feed(text) from public, anon, authenticated;
grant execute on function public.site_feed(text) to anon;

insert into public.site_feeds (slug, account_id)
select 'kjc', id from public.accounts where label = '500k - V100'
on conflict (slug) do nothing;
