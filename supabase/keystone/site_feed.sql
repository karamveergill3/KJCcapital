-- Keystone Monitor: a read-only feed for the KJC Capital website.
--
-- Run once in the Keystone Monitor project's SQL editor (not the KJC schema,
-- and not ForexDNA). It adds one table and one function and changes nothing
-- that is already there.
--
-- site_feeds is an allow list: the website can read an account only if it is
-- named here. site_feed(slug) returns one thing for that account, the
-- percentage gain the portal shows as $KJC, now and at the end of each day
-- Keystone sampled equity. No balance, deposit, profit, account number,
-- server, broker, label, symbol, position or deal leaves Keystone. It is the
-- only thing the public key can reach; every table stays locked.
--
-- $KJC = (equity - broker credit - net deposits) / net deposits, as a percent.
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
  capital_now as (
    select coalesce(sum(d.net), 0) as capital
    from deals d join a on a.id = d.account_id
    where d.kind = 'cash'
  ),
  cash_days as (
    select ad.day, ad.cash_flow
    from account_daily ad join a on a.id = ad.account_id
  ),
  eq as (
    select distinct on ((s.at at time zone 'Europe/London')::date)
      (s.at at time zone 'Europe/London')::date as day,
      s.equity - coalesce(s.credit, 0) as equity
    from equity_samples s join a on a.id = s.account_id
    order by (s.at at time zone 'Europe/London')::date, s.at desc
  ),
  daily as (
    select e.day, e.equity,
      (select coalesce(sum(x.cash_flow), 0) from cash_days x where x.day <= e.day) as capital
    from eq e
  )
  select case
    when not exists (select 1 from a) or (select capital from capital_now) <= 0 then null
    else jsonb_build_object(
      'as_at', (select last_sync_at from a),
      'kjc', round(((select equity - coalesce(credit, 0) from a) - (select capital from capital_now))
                   / (select capital from capital_now) * 100, 4),
      'daily', coalesce(
        (select jsonb_agg(jsonb_build_object('day', d.day, 'kjc', round((d.equity - d.capital) / d.capital * 100, 4)) order by d.day)
         from daily d where d.capital > 0),
        '[]'::jsonb
      )
    )
  end;
$$;

revoke all on function public.site_feed(text) from public, anon, authenticated;
grant execute on function public.site_feed(text) to anon;

insert into public.site_feeds (slug, account_id)
select 'kjc', id from public.accounts where label = '500k - V100'
on conflict (slug) do nothing;
