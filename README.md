# SeatMate

Never watch alone: SeatMate matches solo moviegoers with a compatible seatmate and sits them together, using only the seats a theater has not sold.


Live demo: https://seatmate-kohl.vercel.app

> Demo note: the hosted version uses an in memory store and a demo (frontend only) login, so data resets when the serverless instance goes cold. See the roadmap for the path to a persistent, fully authenticated version.

## Why it exists

Going to the movies alone is common but a little lonely, and theaters leave real revenue in empty seats. SeatMate sits on top of existing ticketing instead of replacing it: it pairs compatible solo goers into adjacent unsold seats, so the theater turns would be empty seats into sales while solo goers get company, and maybe a new friend.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, an in memory store behind a single access layer, and Node's built in test runner for the matcher.

## Features

- **Matching plus adjacent seat assignment** over unsold inventory only.
- **Trust and safety:** same gender option, post show peer ratings, reporting, reputation that gates future matching, and a one tap exit to a solo seat.
- **Interest tags** with tailored ice breakers.
- **Rally a showing:** back an unscheduled slot; enough backers flips it to "ready to schedule".
- **Theater dashboard:** seats filled, revenue uplift, occupancy, and rally demand.
- **Auto match scheduler** that runs before each showtime (on read on serverless, background timer locally).
- **Demo login** with a prefilled identity across the flow.

## Architecture

The interesting parts are the matcher, the trust model, and the theater economics; the rest is deliberately simple so the idea reads clearly.

- **The matcher** lives in `lib/matching.ts` as a pure, dependency free module: compatibility scoring on vibe, age band, and shared tags; hard constraints (same gender when requested, incompatible vibes never paired); greedy grouping capped at the smallest requested group size; and adjacent seat assignment that prefers an aisle for easy exits and still seats anyone unmatched solo. Reputation gating means low rated or reported users are seated but never matched. Covered by a unit suite in `lib/matching.test.ts`.
- **10 API route handlers** under `app/api` (bookings, match, ratings, rally, report, showtimes, theater, and nested booking routes).
- **Roughly 2,600 lines** of TypeScript across `app`, `lib`, and `components`.
- **Swappable storage:** all data access goes through `lib/store.ts`, so the in memory store can be replaced with Postgres or Turso without touching the rest of the app.

## Running locally

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # run the matcher unit tests
```

## Roadmap

- Real authentication (sessions and hashed passwords) on a persistent database (Turso or Postgres).
- Identity verification to strengthen the trust layer.
- Real theater ticketing integration.
- Notifications when a match is confirmed.
