// The SeatMate matcher.
//
// Given the solo people who opted in for one showtime plus the seats the
// theater hasn't sold, group compatible people together and sit each group
// in adjacent seats. Anyone we can't match gets their own seat.
//
// This module is pure: no I/O, no globals. That makes it easy to unit test
// and to swap the storage layer later.

import type { Booking, Interest, Seat, Vibe } from "./types";

export interface AssignedGroup {
  bookingIds: string[];
  seatIds: string[];
  sharedInterests: Interest[];
}

export interface MatchResult {
  groups: AssignedGroup[]; // groups of 2+ people who were matched
  solos: { bookingId: string; seatId: string | null }[]; // unmatched, seated alone
  unseated: string[]; // booking ids we couldn't seat at all (out of inventory)
}

export interface MatchOptions {
  seatsPerRow: number;
  blockedUserIds?: Set<string>; // low-reputation users: seated, never matched
}

// --- Compatibility -------------------------------------------------------

// Vibes sit on a talkativeness scale. Neighbours on the scale are fine;
// pairing a "quiet" watcher with a "friendly" chatter is not.
const VIBE_RANK: Record<Vibe, number> = { quiet: 0, chatty: 1, friendly: 2 };

// Hard constraint: gender preference must be satisfied for BOTH people.
function genderOk(a: Booking, b: Booking): boolean {
  if (a.genderPref === "same" && a.gender !== b.gender) return false;
  if (b.genderPref === "same" && b.gender !== a.gender) return false;
  return true;
}

export function sharedInterests(a: Booking, b: Booking): Interest[] {
  const set = new Set(a.interests);
  return b.interests.filter((i) => set.has(i));
}

// Returns a score for how good a pairing is, or null if the pair is
// incompatible (a hard constraint fails). Higher is better.
export function compatibility(a: Booking, b: Booking): number | null {
  if (a.id === b.id) return null;
  if (!genderOk(a, b)) return null;

  const vibeGap = Math.abs(VIBE_RANK[a.vibe] - VIBE_RANK[b.vibe]);
  if (vibeGap > 1) return null; // quiet vs friendly: leave them apart

  let score = 1;
  score -= vibeGap * 0.35; // same vibe beats merely-adjacent vibe
  if (a.ageBand !== b.ageBand) score -= 0.2; // similar age is a mild plus
  score += sharedInterests(a, b).length * 0.25; // shared tastes are a big plus

  return Math.max(0, score);
}

// A person can only join a group if they're compatible with EVERYONE already
// in it. The group's average pairwise score is what we optimize greedily.
function fitScore(candidate: Booking, members: Booking[]): number | null {
  let total = 0;
  for (const m of members) {
    const s = compatibility(candidate, m);
    if (s === null) return null;
    total += s;
  }
  return total / members.length;
}

// --- Seat geometry -------------------------------------------------------

// All consecutive-free-seat runs of exactly `size` within any single row.
function candidateRuns(freeByRow: Map<string, Seat[]>, size: number): Seat[][] {
  const runs: Seat[][] = [];
  for (const seats of freeByRow.values()) {
    for (let i = 0; i + size <= seats.length; i++) {
      let ok = true;
      for (let j = 1; j < size; j++) {
        if (seats[i + j].number !== seats[i + j - 1].number + 1) {
          ok = false;
          break;
        }
      }
      if (ok) runs.push(seats.slice(i, i + size));
    }
  }
  return runs;
}

// Pick the best run of `size` adjacent seats. When someone in the group wants
// an aisle seat, prefer a run that touches an aisle (seat 1 or the last seat
// in the row). Otherwise take the earliest run for stable, reproducible demos.
function pickRun(freeByRow: Map<string, Seat[]>, size: number, wantAisle: boolean, seatsPerRow: number): Seat[] | null {
  const runs = candidateRuns(freeByRow, size);
  if (runs.length === 0) return null;
  if (!wantAisle) return runs[0];

  const touchesAisle = (run: Seat[]) => run[0].number === 1 || run[run.length - 1].number === seatsPerRow;
  const aisleRun = runs.find(touchesAisle);
  return aisleRun ?? runs[0];
}

function removeSeats(freeByRow: Map<string, Seat[]>, taken: Seat[]) {
  const takenIds = new Set(taken.map((s) => s.id));
  for (const [row, seats] of freeByRow) {
    freeByRow.set(
      row,
      seats.filter((s) => !takenIds.has(s.id)),
    );
  }
}

// Prefer an aisle seat when asked; otherwise any free seat.
function pickSingle(freeByRow: Map<string, Seat[]>, wantAisle: boolean, seatsPerRow: number): Seat | null {
  let fallback: Seat | null = null;
  for (const seats of freeByRow.values()) {
    for (const s of seats) {
      if (!fallback) fallback = s;
      if (wantAisle && (s.number === 1 || s.number === seatsPerRow)) return s;
    }
  }
  return fallback;
}

// --- The matcher ---------------------------------------------------------

export function runMatching(bookings: Booking[], freeSeats: Seat[], opts: MatchOptions): MatchResult {
  const blocked = opts.blockedUserIds ?? new Set<string>();

  // Group the free inventory by row, each row sorted left to right.
  const freeByRow = new Map<string, Seat[]>();
  for (const seat of freeSeats) {
    if (seat.status !== "free") continue;
    const arr = freeByRow.get(seat.row) ?? [];
    arr.push(seat);
    freeByRow.set(seat.row, arr);
  }
  for (const arr of freeByRow.values()) arr.sort((a, b) => a.number - b.number);

  // Deterministic order: oldest opt-in first, so the demo is reproducible.
  const sorted = [...bookings].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const matchable = sorted.filter((b) => !blocked.has(b.userId));
  const blockedBookings = sorted.filter((b) => blocked.has(b.userId));

  const rawGroups: Booking[][] = [];
  const used = new Set<string>();

  for (const seed of matchable) {
    if (used.has(seed.id)) continue;
    const members = [seed];
    used.add(seed.id);

    // Greedily add the best-fitting compatible person until the group hits the
    // cap. The cap is the SMALLEST maxGroupSize among current members, so
    // nobody ends up in a bigger group than they asked for.
    while (members.length < groupCap(members)) {
      let best: Booking | null = null;
      let bestScore = -1;
      for (const cand of matchable) {
        if (used.has(cand.id)) continue;
        const fit = fitScore(cand, members);
        if (fit === null) continue;
        if (fit > bestScore) {
          bestScore = fit;
          best = cand;
        }
      }
      if (!best) break;
      members.push(best);
      used.add(best.id);
    }

    rawGroups.push(members);
  }

  const groups: AssignedGroup[] = [];
  const solos: { bookingId: string; seatId: string | null }[] = [];
  const unseated: string[] = [];

  for (const members of rawGroups) {
    if (members.length >= 2) {
      const wantAisle = members.some((m) => m.aisleSeat);
      const run = pickRun(freeByRow, members.length, wantAisle, opts.seatsPerRow);
      if (run) {
        removeSeats(freeByRow, run);
        groups.push({
          bookingIds: members.map((m) => m.id),
          seatIds: run.map((s) => s.id),
          sharedInterests: commonInterests(members),
        });
        continue;
      }
      // Couldn't find adjacent seats for the whole group: fall back to
      // seating each member individually so nobody is left without a seat.
    }

    for (const m of members) seatSolo(m, freeByRow, opts.seatsPerRow, solos, unseated);
  }

  // Blocked users are never matched, but they still get a seat.
  for (const m of blockedBookings) seatSolo(m, freeByRow, opts.seatsPerRow, solos, unseated);

  return { groups, solos, unseated };
}

function seatSolo(
  m: Booking,
  freeByRow: Map<string, Seat[]>,
  seatsPerRow: number,
  solos: { bookingId: string; seatId: string | null }[],
  unseated: string[],
) {
  const seat = pickSingle(freeByRow, m.aisleSeat, seatsPerRow);
  if (seat) {
    removeSeats(freeByRow, [seat]);
    solos.push({ bookingId: m.id, seatId: seat.id });
  } else {
    unseated.push(m.id);
  }
}

// The effective cap for a group is the smallest maxGroupSize among its members.
function groupCap(members: Booking[]): number {
  let cap = 4;
  for (const m of members) cap = Math.min(cap, m.maxGroupSize);
  return cap;
}

// Interests shared by EVERY member of the group.
function commonInterests(members: Booking[]): Interest[] {
  if (members.length === 0) return [];
  let common = new Set(members[0].interests);
  for (const m of members.slice(1)) {
    common = new Set(m.interests.filter((i) => common.has(i)));
  }
  return [...common];
}
