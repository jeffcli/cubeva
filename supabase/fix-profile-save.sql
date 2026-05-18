create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

insert into public.profiles (id, username, display_name)
select
  auth.uid(),
  coalesce(auth.jwt() -> 'user_metadata' ->> 'username', split_part(auth.jwt() ->> 'email', '@', 1)),
  coalesce(auth.jwt() -> 'user_metadata' ->> 'display_name', split_part(auth.jwt() ->> 'email', '@', 1))
where auth.uid() is not null
on conflict (id) do nothing;
