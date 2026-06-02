-- Schedule the WCA personal best importer to run once per day.
--
-- Before running this, store these values in Supabase Vault:
-- select vault.create_secret('https://your-project-ref.supabase.co', 'project_url');
-- select vault.create_secret('your-supabase-publishable-or-anon-key', 'publishable_key');
-- select vault.create_secret('the-same-value-as-IMPORT_WCA_SECRET', 'wca_import_secret');

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'wca-pb-daily-import') then
    perform cron.unschedule('wca-pb-daily-import');
  end if;
end $$;

select
  cron.schedule(
    'wca-pb-daily-import',
    '20 8 * * *',
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/import-wca-personal-bests',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
          'x-import-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'wca_import_secret')
        ),
        body := '{"all":true}'::jsonb
      ) as request_id;
    $$
  );
