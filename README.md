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

## Backend path

The file `supabase/schema.sql` contains the starting database model. After creating a Supabase project, run that SQL in the Supabase SQL editor, then add Supabase Auth and replace the local React state with API calls.
