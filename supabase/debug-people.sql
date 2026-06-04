-- Debug why users do not appear on the People page.
--
-- People reads public.profiles, not auth.users directly.
-- Run these queries in Supabase SQL Editor.

-- 1) Count Auth users vs visible app profiles.
select
  (select count(*) from auth.users) as auth_user_count,
  (select count(*) from public.profiles) as profile_count;

-- 2) Show Auth users and whether they have a matching profile row.
select
  users.id,
  users.email,
  users.created_at as auth_created_at,
  profiles.username,
  profiles.display_name,
  profiles.created_at as profile_created_at,
  profiles.id is not null as has_profile
from auth.users users
left join public.profiles profiles on profiles.id = users.id
order by users.created_at desc;

-- 3) Backfill any missing profile rows.
-- Uncomment and run this if has_profile is false for any user above.
--
-- insert into public.profiles (id, username, display_name, avatar_url, bio)
-- select
--   users.id,
--   coalesce(
--     nullif(users.raw_user_meta_data ->> 'username', ''),
--     split_part(users.email, '@', 1),
--     'cuber'
--   ) || '-' || left(users.id::text, 8),
--   coalesce(
--     nullif(users.raw_user_meta_data ->> 'display_name', ''),
--     split_part(users.email, '@', 1),
--     'CubeVa Cuber'
--   ),
--   null,
--   null
-- from auth.users users
-- where not exists (
--   select 1
--   from public.profiles
--   where profiles.id = users.id
-- );
