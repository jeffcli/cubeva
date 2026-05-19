alter table public.profiles
  add column if not exists wca_id text unique;

create table if not exists public.wca_personal_bests (
  wca_id text not null,
  event_id text not null,
  event_name text not null,
  best_single integer,
  best_average integer,
  world_rank_single integer,
  country_rank_single integer,
  continent_rank_single integer,
  world_rank_average integer,
  country_rank_average integer,
  continent_rank_average integer,
  updated_at timestamptz default now() not null,
  primary key (wca_id, event_id)
);

alter table public.wca_personal_bests enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wca_personal_bests'
      and policyname = 'WCA personal bests are visible to everyone'
  ) then
    create policy "WCA personal bests are visible to everyone"
      on public.wca_personal_bests for select
      using (true);
  end if;
end $$;
