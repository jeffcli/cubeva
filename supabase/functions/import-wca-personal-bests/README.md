# WCA PB Import Function

This Edge Function imports WCA personal bests into `wca_personal_bests` using the documented WCA REST API files.

Deploy it with:

```sh
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set IMPORT_WCA_SECRET=your-random-import-secret
supabase functions deploy import-wca-personal-bests
```

Import one WCA ID:

```sh
supabase functions invoke import-wca-personal-bests \
  --headers '{"x-import-secret":"your-random-import-secret"}' \
  --body '{"wcaId":"2012PARK03"}'
```

Import every linked profile WCA ID:

```sh
supabase functions invoke import-wca-personal-bests \
  --headers '{"x-import-secret":"your-random-import-secret"}' \
  --body '{"all":true}'
```

For automatic updates, run `supabase/schedule-wca-personal-bests.sql` after storing the Vault secrets listed in that file.
