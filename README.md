# CubeVa

CubeVa is a starter MVP for a Strava-style speedcubing social app.

## What is included

- Built-in timer that logs solves into the current session
- Manual solve entry with `OK`, `+2`, and `DNF`
- Session stats: latest, best, average, solve count
- Publishable session cards in a following feed
- Follow/unfollow UI for other cubers
- Supabase-ready schema for profiles, follows, sessions, and solves

## Run locally

```bash
npm install
npm run dev
```

The app will run at `http://127.0.0.1:5173`.

## Auth setup

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Add your project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Restart `npm run dev`.

New signups automatically create a row in `profiles` using the username and display name from the signup form.

## Backend path

The file `supabase/schema.sql` contains the starting database model, row level security policies, and the auth trigger that creates profiles.
