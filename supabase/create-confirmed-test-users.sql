-- Create immediately-confirmed local test users without email confirmation.
--
-- Run this in the Supabase SQL editor for local/dev testing only.
-- Change the emails/passwords/usernames before running if you want.

do $$
declare
  test_users jsonb := '[
    {
      "email": "cubeva.test+one@example.com",
      "password": "password123",
      "username": "testone",
      "display_name": "Test One"
    },
    {
      "email": "cubeva.test+two@example.com",
      "password": "password123",
      "username": "testtwo",
      "display_name": "Test Two"
    }
  ]'::jsonb;
  test_user jsonb;
  new_user_id uuid;
begin
  for test_user in select * from jsonb_array_elements(test_users)
  loop
    select id
      into new_user_id
    from auth.users
    where email = test_user ->> 'email';

    if new_user_id is null then
      new_user_id := gen_random_uuid();

      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      values (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        test_user ->> 'email',
        crypt(test_user ->> 'password', gen_salt('bf')),
        now(),
        jsonb_build_object(
          'username', test_user ->> 'username',
          'display_name', test_user ->> 'display_name'
        ),
        now(),
        now()
      );
    end if;

    insert into public.profiles (id, username, display_name)
    values (
      new_user_id,
      (test_user ->> 'username') || '-' || left(new_user_id::text, 8),
      test_user ->> 'display_name'
    )
    on conflict (id) do update
      set
        username = excluded.username,
        display_name = excluded.display_name;
  end loop;
end $$;
