-- Creates missing public.profiles rows for Auth users that already exist.
-- Run this in the Supabase SQL editor if accounts exist in Authentication
-- but do not appear on the People page.

insert into public.profiles (id, username, display_name, avatar_url, bio)
select
  users.id,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'username', ''),
    split_part(users.email, '@', 1),
    'cuber'
  ) || '-' || left(users.id::text, 8),
  coalesce(
    nullif(users.raw_user_meta_data ->> 'display_name', ''),
    split_part(users.email, '@', 1),
    'CubeVa Cuber'
  ),
  null,
  null
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, bio)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1), 'cuber') || '-' || left(new.id::text, 8),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'CubeVa Cuber'),
    null,
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
