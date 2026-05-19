create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  wca_id text unique,
  created_at timestamptz default now() not null
);

create table public.wca_personal_bests (
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

create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  puzzle text not null,
  title text not null,
  visibility text default 'public' not null check (visibility in ('public', 'followers', 'private')),
  is_manual boolean default false not null,
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  created_at timestamptz default now() not null
);

create table public.solves (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  time_ms integer not null check (time_ms > 0),
  penalty text default 'ok' not null check (penalty in ('ok', '+2', 'dnf')),
  scramble text,
  notes text,
  created_at timestamptz default now() not null
);

create index sessions_user_created_idx on public.sessions (user_id, created_at desc);
create index solves_session_created_idx on public.solves (session_id, created_at desc);
create index follows_following_idx on public.follows (following_id);

alter table public.profiles enable row level security;
alter table public.wca_personal_bests enable row level security;
alter table public.follows enable row level security;
alter table public.sessions enable row level security;
alter table public.solves enable row level security;

create policy "Profiles are visible to everyone"
  on public.profiles for select
  using (true);

create policy "WCA personal bests are visible to everyone"
  on public.wca_personal_bests for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can read their own follows"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = following_id);

create policy "Users can manage their own follows"
  on public.follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

create policy "Public sessions are visible to everyone"
  on public.sessions for select
  using (visibility = 'public' or auth.uid() = user_id);

create policy "Users can manage their own sessions"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Solves are visible with their sessions"
  on public.solves for select
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = solves.session_id
        and (sessions.visibility = 'public' or sessions.user_id = auth.uid())
    )
  );

create policy "Users can manage solves in their sessions"
  on public.solves for all
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = solves.session_id
        and sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.sessions
      where sessions.id = solves.session_id
        and sessions.user_id = auth.uid()
    )
  );

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    null,
    null
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
