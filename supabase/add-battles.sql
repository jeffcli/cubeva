create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  opponent_id uuid references public.profiles(id) on delete cascade not null,
  event_label text not null,
  goal text default 'best_single' not null check (goal in ('best_single', 'average', 'most_solves')),
  status text default 'active' not null check (status in ('pending', 'active', 'completed', 'cancelled')),
  starts_at timestamptz default now() not null,
  ends_at timestamptz not null,
  created_at timestamptz default now() not null,
  check (creator_id <> opponent_id),
  check (ends_at > starts_at)
);

create index if not exists battles_creator_created_idx
  on public.battles (creator_id, created_at desc);

create index if not exists battles_opponent_created_idx
  on public.battles (opponent_id, created_at desc);

alter table public.battles enable row level security;

drop policy if exists "Battle participants can read battles"
  on public.battles;
create policy "Battle participants can read battles"
  on public.battles for select
  using (auth.uid() = creator_id or auth.uid() = opponent_id);

drop policy if exists "Users can create battles as themselves"
  on public.battles;
create policy "Users can create battles as themselves"
  on public.battles for insert
  with check (auth.uid() = creator_id and creator_id <> opponent_id);

drop policy if exists "Battle participants can update battles"
  on public.battles;
create policy "Battle participants can update battles"
  on public.battles for update
  using (auth.uid() = creator_id or auth.uid() = opponent_id)
  with check (auth.uid() = creator_id or auth.uid() = opponent_id);
