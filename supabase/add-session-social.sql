create table if not exists public.session_kudos (
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (session_id, user_id)
);

create table if not exists public.session_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz default now() not null
);

create index if not exists session_kudos_user_idx
  on public.session_kudos (user_id);

create index if not exists session_comments_session_created_idx
  on public.session_comments (session_id, created_at asc);

alter table public.session_kudos enable row level security;
alter table public.session_comments enable row level security;

drop policy if exists "Session kudos are visible with public sessions"
  on public.session_kudos;
create policy "Session kudos are visible with public sessions"
  on public.session_kudos for select
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = session_kudos.session_id
        and (sessions.visibility = 'public' or sessions.user_id = auth.uid())
    )
  );

drop policy if exists "Users can manage their own kudos"
  on public.session_kudos;
create policy "Users can manage their own kudos"
  on public.session_kudos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Session comments are visible with public sessions"
  on public.session_comments;
create policy "Session comments are visible with public sessions"
  on public.session_comments for select
  using (
    exists (
      select 1
      from public.sessions
      where sessions.id = session_comments.session_id
        and (sessions.visibility = 'public' or sessions.user_id = auth.uid())
    )
  );

drop policy if exists "Users can insert their own comments"
  on public.session_comments;
create policy "Users can insert their own comments"
  on public.session_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments"
  on public.session_comments;
create policy "Users can delete their own comments"
  on public.session_comments for delete
  using (auth.uid() = user_id);
