-- WCA IDs should be saveable on profiles before official PB rows are imported.
-- This keeps profiles.wca_id as a plain unique text field and removes any
-- accidental foreign key that requires a matching wca_personal_bests row.

alter table public.profiles
  add column if not exists wca_id text;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'f'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.profiles'::regclass
            and attname = 'wca_id'
        )
      ]::smallint[]
  loop
    execute format(
      'alter table public.profiles drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

create unique index if not exists profiles_wca_id_unique
  on public.profiles (wca_id)
  where wca_id is not null;
