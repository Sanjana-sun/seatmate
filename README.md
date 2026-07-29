# SeatMate

**Never watch alone.** SeatMate matches solo moviegoers with a compatible seatmate and sits them together, using only the seats a theater hasn't sold. It sits on top of existing ticketing rather than replacing it, so a theater turns would-be-empty seats into sales while solo-goers get company (and maybe a new friend).

🔗 **Live demo:** https://seatmate-kohl.vercel.app

> Demo note: the hosted version uses an in-memory store and a demo (frontend-only) login, so data resets when the serverless instance goes cold. See [Roadmap](#roadmap) for the path to a persistent, fully-authenticated version.

---

## How it works

1. **Opt in.** Pick a showtime and share your vibe (here to watch / up for a chat / open to a new friend), age band, group-size cap, taste tags, and safety preferences.
2. **Get matched.** A matcher groups compatible solo-goers and assigns them adjacent seats from the theater's *unsold* inventory. It runs automatically shortly before showtime.
3. **Sit together.** You see who you're paired with, a shared ice-breaker, and a one-tap way to switch to a solo seat if you change your mind.

## The matcher

The core logic lives in [`lib/matching.ts`](lib/matching.ts) as a pure, dependency-free module (easy to test, easy to move to any backend):

- **Compatibility scoring** on vibe (a talkativeness scale), age band, and shared interest tags.
- **Hard constraints:** same-gender matching when requested (enforced both ways); incompatible vibes are never paired.
- **Greedy grouping** capped at the smallest `maxGroupSize` among members, so nobody lands in a bigger group than they asked for.
- **Seat assignment** finds a run of adjacent seats in a single row, preferring an aisle when someone wants an easy exit; anyone who can't be matched is still seated solo.
- **Reputation gating:** low-rated or reported users are seated but never matched.

Covered by a unit suite in [`lib/matching.test.ts`](lib/matching.test.ts).

## Features

- **Matching + adjacent-seat assignment** over unsold inventory only
- **Trust & safety:** same-gender option, post-show peer ratings, reporting, reputation that gates future matching, and a graceful one-tap exit to a solo seat
- **Interest tags** with tailored ice-breakers
- **Rally a showing:** back an unscheduled slot; enough backers flips it to "ready to schedule"
- **Theater dashboard:** seats filled, revenue uplift, occupancy, and rally demand
- **Auto-match scheduler** that runs before each showtime (on-read on serverless, background timer locally)
- **Demo login** with prefilled identity across the flow

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- In-memory store behind a single access layer ([`lib/store.ts`](lib/store.ts)): swap for Postgres/Turso without touching the rest of the app
- Node's built-in test runner for the matcher

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Run the matcher tests:

```bash
npm test
```

## Project structure

```
app/
  page.tsx              Landing page
  login/                Demo login / signup
  showtimes/            Showtime list (gated)
  showtime/[id]/        Seat map + opt-in form
  match/[id]/           Match reveal (ratings, ice-breaker, exit)
  theater/              Theater yield dashboard
  rally/                Rally a showing
  api/                  Route handlers (bookings, match, ratings, rally, ...)
lib/
  matching.ts           The matcher (pure)
  matching.test.ts      Unit tests
  store.ts              Data access + seed
  types.ts              Domain model
  auth.ts, useUser.ts   Demo session
instrumentation.ts      Local match scheduler
```

## Roadmap

- Real authentication (sessions + hashed passwords) on a persistent database (Turso/Postgres)
- Identity verification to strengthen the trust layer
- Real theater ticketing integration
- Notifications when a match is confirmed

---

Built as a full-stack demo. The matcher, trust model, and theater economics are the interesting parts; the rest is deliberately simple so the idea reads clearly.
