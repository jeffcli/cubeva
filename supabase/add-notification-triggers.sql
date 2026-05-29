drop policy if exists "Users can read their own follows"
  on public.follows;
drop policy if exists "Follows are visible to everyone"
  on public.follows;
create policy "Follows are visible to everyone"
  on public.follows for select
  using (true);

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor_name text;
begin
  select coalesce(display_name, username, 'A cuber')
    into actor_name
  from public.profiles
  where id = new.follower_id;

  insert into public.notifications (recipient_id, actor_id, type, message)
  values (
    new.following_id,
    new.follower_id,
    'follow',
    coalesce(actor_name, 'A cuber') || ' followed you.'
  );

  return new;
end;
$$;

drop trigger if exists on_follow_created on public.follows;
create trigger on_follow_created
  after insert on public.follows
  for each row execute procedure public.notify_on_follow();

create or replace function public.notify_on_kudos()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor_name text;
  owner_id uuid;
  session_puzzle text;
begin
  select user_id, puzzle
    into owner_id, session_puzzle
  from public.sessions
  where id = new.session_id;

  if owner_id is null or owner_id = new.user_id then
    return new;
  end if;

  select coalesce(display_name, username, 'A cuber')
    into actor_name
  from public.profiles
  where id = new.user_id;

  insert into public.notifications (recipient_id, actor_id, type, session_id, message)
  values (
    owner_id,
    new.user_id,
    'kudos',
    new.session_id,
    coalesce(actor_name, 'A cuber') || ' gave kudos to your ' || session_puzzle || ' session.'
  );

  return new;
end;
$$;

drop trigger if exists on_session_kudos_created on public.session_kudos;
create trigger on_session_kudos_created
  after insert on public.session_kudos
  for each row execute procedure public.notify_on_kudos();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor_name text;
  owner_id uuid;
  session_puzzle text;
begin
  select user_id, puzzle
    into owner_id, session_puzzle
  from public.sessions
  where id = new.session_id;

  if owner_id is null or owner_id = new.user_id then
    return new;
  end if;

  select coalesce(display_name, username, 'A cuber')
    into actor_name
  from public.profiles
  where id = new.user_id;

  insert into public.notifications (recipient_id, actor_id, type, session_id, message)
  values (
    owner_id,
    new.user_id,
    'comment',
    new.session_id,
    coalesce(actor_name, 'A cuber') || ' commented on your ' || session_puzzle || ' session.'
  );

  return new;
end;
$$;

drop trigger if exists on_session_comment_created on public.session_comments;
create trigger on_session_comment_created
  after insert on public.session_comments
  for each row execute procedure public.notify_on_comment();
