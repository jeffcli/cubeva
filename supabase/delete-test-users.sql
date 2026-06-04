-- Delete CubeVa test accounts created with the signup email-alias option.
--
-- This targets Auth users whose email local-part contains "+cubeva-".
-- Example matched email: you+cubeva-testtwo@example.com
--
-- Run the preview query first. Only run the delete query after confirming the
-- listed accounts are safe to remove.

-- 1) Preview accounts that would be deleted:
select
  id,
  email,
  created_at
from auth.users
where email ilike '%+cubeva-%@%'
order by created_at desc;

-- 2) Delete those accounts.
-- Deleting auth.users cascades to public.profiles and app data that references
-- profiles with on delete cascade.
--
-- Uncomment this block when ready:
--
-- delete from auth.users
-- where email ilike '%+cubeva-%@%';

-- 3) Optional: delete one specific test account instead.
-- Replace the email and uncomment:
--
-- delete from auth.users
-- where email = 'you+cubeva-testtwo@example.com';
