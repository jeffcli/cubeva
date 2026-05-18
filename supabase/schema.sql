create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null
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
