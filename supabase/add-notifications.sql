create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('comment', 'follow', 'kudos')),
  session_id uuid references public.sessions(id) on delete cascade,
  message text not null,
  read boolean default false not null,
  created_at timestamptz default now() not null,
  check (recipient_id <> actor_id)
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, read)
  where read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users can read their own notifications"
  on public.notifications;
create policy "Users can read their own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

drop policy if exists "Users can create notifications as themselves"
  on public.notifications;
create policy "Users can create notifications as themselves"
  on public.notifications for insert
  with check (auth.uid() = actor_id and auth.uid() <> recipient_id);

drop policy if exists "Users can mark their own notifications read"
  on public.notifications;
create policy "Users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
