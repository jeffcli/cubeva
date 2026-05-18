# CubeVa

CubeVa is a starter MVP for a Strava-style speedcubing social app.

## What is included

- Built-in timer that logs solves into the current session
- Manual solve entry with `OK`, `+2`, and `DNF`
- Session stats: latest, best, average, solve count
- Publishable session cards in a following feed
- Follow/unfollow UI for other cubers
- Supabase-ready schema for profiles, follows, sessions, and solves
- Supabase auth plus persisted sessions/solves for signed-in users
- Profile view with PBs, recent sessions, editable self profile, and public demo profiles

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

## Session persistence

When Supabase is configured and a user is signed in:

- The feed loads that user's saved sessions from `sessions` and `solves`.
- Publishing a timer/manual block inserts one row into `sessions`.
- Each solve in the block is inserted into `solves`.
- Refreshing the app reloads saved session history from Supabase.

Demo mode still keeps everything local in browser state.

## Profiles

The Profile tab shows a user summary, PB, average, total sessions, total solves, and recent sessions. Signed-in users can edit their display name, username, and bio, which updates the `profiles` table. The People panel currently includes demo public profiles; the next backend step is to replace those with real profile search and persisted follows.

## Backend path

The file `supabase/schema.sql` contains the starting database model, row level security policies, and the auth trigger that creates profiles.
