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
- Optional WCA ID on profiles with a cache table for official WCA personal bests
- Real Supabase follow/unfollow plus following-feed queries for signed-in users
- Cubing-focused timer features: generated scrambles, inspection, Ao5/Ao12, penalties, delete, and pasted time import

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

## Cubing features

- Scrambles are generated with the `cubing` package for supported WCA-style events, with a fallback generator if loading fails.
- Supported events: `2x2` through `7x7`, `3x3`, `3x3 OH`, `3x3 FMC`, `3x3 BLD`, `4x4 BLD`, `5x5 BLD`, `3x3 MBLD`, `Clock`, `Megaminx`, `Pyraminx`, `Skewb`, and `Square-1`.
- The timer supports optional 15-second inspection. Starting after 15 seconds marks the solve `+2`; starting after 17 seconds marks it `DNF`.
- WCA inspection defaults on for sighted timed events: `2x2` through `7x7`, `Clock`, `Megaminx`, `Pyraminx`, `Skewb`, `Square-1`, and `3x3 OH`.
- WCA inspection is off for blindfolded events: `3x3 BLD`, `4x4 BLD`, `5x5 BLD`, and `3x3 MBLD`.
- `3x3 FMC` is manual-only and records move counts instead of timer results.
- Current-session stats include latest, best, mean, Ao5, Ao12, and solve count.
- Solves in the active session can be changed between `OK`, `+2`, and `DNF`, or deleted before publishing.
- The manual log supports single solves and pasted lists like `18.42, 17.90 +2, DNF 20.10`.

## Profiles

The Profile tab shows a user summary, PB, average, total sessions, total solves, linked WCA personal bests, and recent sessions. Signed-in users can edit their display name, username, bio, and WCA ID, which updates the `profiles` table. The People panel currently includes demo public profiles; the next backend step is to replace those with real profile search and persisted follows.

Existing Supabase projects should run `supabase/add-wca-personal-bests.sql` once in the SQL editor. New projects can run the full `supabase/schema.sql`.

WCA personal bests are read from `wca_personal_bests`, keyed by `wca_id` and `event_id`. The app displays the section when a profile has a WCA ID; rows are populated by the local importer below.

## Import WCA personal bests

The importer reads WCA person ranking data from the WST-endorsed unofficial WCA API, then upserts those rows into Supabase.

Add your service role key to `.env.local` for local imports only:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find it in Supabase under Project Settings > API > service_role key. Keep this key out of browser code and never commit it.

Import one WCA ID:

```bash
npm run import:wca -- 2019SMIT01
```

Import every profile that has a `wca_id`:

```bash
npm run import:wca -- --all
```

## Social feed

When signed in, the People panel loads real profiles from Supabase, excluding the current user. Follow/unfollow writes to the `follows` table. The Feed panel loads public sessions from followed users, so testing the full loop requires at least two accounts:

1. Sign up as account A and publish a session.
2. Sign out, sign up as account B.
3. Follow account A from People.
4. Open Feed to see account A's public sessions.

## Backend path

The file `supabase/schema.sql` contains the starting database model, row level security policies, and the auth trigger that creates profiles.
