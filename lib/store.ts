// In-process store, seeded on first use. This is the serverless-safe backend:
// it needs no filesystem and no native/experimental modules, so it runs
// identically in local dev and on Vercel. Data is ephemeral (per instance,
// reseeds on a cold start) — durability would mean a hosted DB (Postgres/Turso).
//
// A globalThis singleton keeps it alive across Next.js hot-reloads and across
// requests within one warm serverless instance. Every access goes through the
// accessors below, so swapping in a real DB later touches only this file.

import type { Booking, Group, Interest, Movie, Rally, Seat, Showtime, User } from "./types";
import { commonIceBreaker } from "./icebreakers";
import { runMatching } from "./matching";

const TICKET_PRICE = 14; // used for the theater's revenue-uplift estimate

interface DB {
  movies: Movie[];
  showtimes: Showtime[];
  seats: Record<string, Seat[]>; // showtimeId -> seats
  users: User[];
  bookings: Booking[];
  groups: Group[];
  rallies: Rally[];
}

// --- Seed data -----------------------------------------------------------

const MOVIES: Movie[] = [
  { id: "m1", title: "Neon Tide", runtimeMins: 118, rating: "PG-13", poster: "🌊", blurb: "A synth-soaked heist across a drowned city." },
  { id: "m2", title: "The Quiet Orbit", runtimeMins: 132, rating: "PG", poster: "🛰️", blurb: "Two strangers stranded on a failing space station." },
  { id: "m3", title: "Paper Lanterns", runtimeMins: 104, rating: "PG-13", poster: "🏮", blurb: "A tender festival romance told over one long night." },
  { id: "m4", title: "Grain & Ash", runtimeMins: 96, rating: "R", poster: "🌾", blurb: "A slow-burn Western about the last honest sheriff." },
];

// Showtimes are seeded relative to "now" so a live demo always has one whose
// auto-match window is imminent (matches within a tick) while the rest are
// still comfortably in the future.
function inMinutes(mins: number): string {
  return new Date(Date.now() + mins * 60_000).toISOString();
}
function minusMinutes(iso: string, mins: number): string {
  return new Date(new Date(iso).getTime() - mins * 60_000).toISOString();
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) || 1;
}

function seatMapFor(showtimeId: string, rows: string[], perRow: number, soldFraction: number): Seat[] {
  const seats: Seat[] = [];
  let n = hashString(showtimeId); // deterministic "already sold" seats
  const rand = () => {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    return n / 0x7fffffff;
  };
  for (const row of rows) {
    for (let i = 1; i <= perRow; i++) {
      seats.push({ id: `${row}${i}`, row, number: i, status: rand() < soldFraction ? "sold" : "free" });
    }
  }
  return seats;
}

function seed(): DB {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const perRow = 12;
  // s4 starts in 15 min so its auto-match window (start - 15 min) is due now,
  // demonstrating the scheduler live.
  const defs = [
    { id: "s4", movieId: "m3", startsAt: inMinutes(15), auditorium: "Hall 4", sold: 0.25 },
    { id: "s1", movieId: "m1", startsAt: inMinutes(50), auditorium: "Hall 1", sold: 0.55 },
    { id: "s3", movieId: "m2", startsAt: inMinutes(95), auditorium: "Hall 2", sold: 0.6 },
    { id: "s2", movieId: "m1", startsAt: inMinutes(150), auditorium: "Hall 3", sold: 0.35 },
  ];
  const showtimes: Showtime[] = defs.map((d) => ({
    id: d.id,
    movieId: d.movieId,
    startsAt: d.startsAt,
    autoMatchAt: minusMinutes(d.startsAt, 15),
    auditorium: d.auditorium,
    rows,
    seatsPerRow: perRow,
  }));
  const seats: Record<string, Seat[]> = {};
  for (const d of defs) seats[d.id] = seatMapFor(d.id, rows, perRow, d.sold);

  return { movies: MOVIES, showtimes, seats, users: [], bookings: [], groups: [], rallies: [] };
}

// --- Singleton -----------------------------------------------------------

const g = globalThis as unknown as { __seatmateDB?: DB };
if (!g.__seatmateDB) g.__seatmateDB = seed();
const db = g.__seatmateDB;

const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

// --- Reputation ----------------------------------------------------------

export interface Reputation {
  avg: number | null;
  count: number;
  reports: number;
  blocked: boolean;
  label: "new" | "trusted" | "watch" | "blocked";
}

export function reputationOf(userId: string): Reputation {
  const u = db.users.find((x) => x.id === userId);
  if (!u) return { avg: null, count: 0, reports: 0, blocked: false, label: "new" };
  const avg = u.ratingCount ? u.ratingSum / u.ratingCount : null;
  const blocked = u.reportCount >= 3 || (u.ratingCount >= 2 && (avg as number) < 2.5);
  let label: Reputation["label"] = "new";
  if (blocked) label = "blocked";
  else if (avg !== null && avg >= 4) label = "trusted";
  else if (avg !== null && avg < 3) label = "watch";
  return { avg, count: u.ratingCount, reports: u.reportCount, blocked, label };
}

function blockedUserIds(): Set<string> {
  return new Set(db.users.filter((u) => reputationOf(u.id).blocked).map((u) => u.id));
}

// --- Accessors -----------------------------------------------------------

export function getMovies(): Movie[] {
  return db.movies;
}
export function getMovie(id: string): Movie | undefined {
  return db.movies.find((m) => m.id === id);
}
export function getShowtimes(): Showtime[] {
  return [...db.showtimes].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
export function getShowtime(id: string): Showtime | undefined {
  return db.showtimes.find((s) => s.id === id);
}
export function getSeats(showtimeId: string): Seat[] {
  return db.seats[showtimeId] ?? [];
}
export function getBookings(showtimeId: string): Booking[] {
  return db.bookings.filter((b) => b.showtimeId === showtimeId);
}
export function getBooking(id: string): Booking | undefined {
  return db.bookings.find((b) => b.id === id);
}
export function getGroup(id: string): Group | undefined {
  return db.groups.find((gr) => gr.id === id);
}
export function getUser(id: string): User | undefined {
  return db.users.find((u) => u.id === id);
}

// Demo simplification: a "returning" user is identified by exact name.
function findOrCreateUser(name: string, gender: User["gender"]): User {
  const existing = db.users.find((u) => u.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const user: User = { id: rid("u"), name, gender, verified: false, ratingSum: 0, ratingCount: 0, reportCount: 0 };
  db.users.push(user);
  return user;
}

export function verifyUser(userId: string): boolean {
  const u = getUser(userId);
  if (!u) return false;
  u.verified = true;
  return true;
}

export function addBooking(input: Omit<Booking, "id" | "userId" | "createdAt" | "status">): Booking {
  const user = findOrCreateUser(input.name, input.gender);
  const booking: Booking = { ...input, userId: user.id, id: rid("b"), createdAt: new Date().toISOString(), status: "waiting" };
  db.bookings.push(booking);
  return booking;
}

// --- Ratings & reports ---------------------------------------------------

export function rateUser(userId: string, stars: number): boolean {
  const u = getUser(userId);
  if (!u || stars < 1 || stars > 5) return false;
  u.ratingSum += stars;
  u.ratingCount += 1;
  return true;
}

export function reportUser(userId: string): boolean {
  const u = getUser(userId);
  if (!u) return false;
  u.reportCount += 1;
  return true;
}

// --- Rallies -------------------------------------------------------------

export function getRallies(): Rally[] {
  return db.rallies;
}

export function addOrSupportRally(movieId: string, window: string, supporterName: string, gender: User["gender"]): Rally {
  const user = findOrCreateUser(supporterName, gender);
  const existing = db.rallies.find((r) => r.movieId === movieId && r.window === window);
  if (existing) {
    if (!existing.supporterIds.includes(user.id)) existing.supporterIds.push(user.id);
    return existing;
  }
  const rally: Rally = { id: rid("r"), movieId, window, supporterIds: [user.id], createdAt: new Date().toISOString() };
  db.rallies.push(rally);
  return rally;
}

// --- Matching ------------------------------------------------------------

export function matchShowtime(showtimeId: string): { matched: number; groups: number; solos: number } {
  const showtime = getShowtime(showtimeId);
  if (!showtime) return { matched: 0, groups: 0, solos: 0 };

  const seats = getSeats(showtimeId);
  const bookings = getBookings(showtimeId).filter((b) => b.status !== "left");

  // Release seats the matcher held on a previous run; keep truly-sold ones.
  for (const seat of seats) if (seat.status === "held") seat.status = "free";
  for (const b of bookings) {
    b.status = "waiting";
    b.groupId = undefined;
    b.seatId = undefined;
  }
  db.groups = db.groups.filter((gr) => gr.showtimeId !== showtimeId);

  const result = runMatching(bookings, seats, { seatsPerRow: showtime.seatsPerRow, blockedUserIds: blockedUserIds() });
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const seatById = new Map(seats.map((s) => [s.id, s]));

  for (const grp of result.groups) {
    const group: Group = {
      id: rid("g"),
      showtimeId,
      bookingIds: grp.bookingIds,
      seatIds: grp.seatIds,
      sharedInterests: grp.sharedInterests,
      iceBreaker: commonIceBreaker(grp.sharedInterests),
    };
    db.groups.push(group);
    grp.bookingIds.forEach((bid, i) => {
      const b = byId.get(bid)!;
      b.status = "matched";
      b.groupId = group.id;
      b.seatId = grp.seatIds[i];
    });
    for (const sid of grp.seatIds) seatById.get(sid)!.status = "held";
  }

  for (const solo of result.solos) {
    const b = byId.get(solo.bookingId)!;
    b.status = "solo";
    if (solo.seatId) {
      b.seatId = solo.seatId;
      seatById.get(solo.seatId)!.status = "held";
    }
  }

  return {
    matched: result.groups.reduce((n, g2) => n + g2.bookingIds.length, 0),
    groups: result.groups.length,
    solos: result.solos.length,
  };
}

// The scheduler's tick: match any showtime past its auto-match time that still
// has people waiting. matchShowtime is idempotent, so late opt-ins get folded
// in on the next tick.
export function runDueMatches(): string[] {
  const ran: string[] = [];
  for (const s of db.showtimes) if (runDueMatchesFor(s.id)) ran.push(s.id);
  return ran;
}

// Match a single showtime if it's due and has people waiting. Called on read so
// auto-matching works on serverless (Vercel) where there's no background timer:
// the match page polls the booking endpoint, which drives this.
export function runDueMatchesFor(showtimeId: string): boolean {
  const now = new Date().toISOString();
  const st = getShowtime(showtimeId);
  if (!st || st.autoMatchAt > now) return false;
  const hasWaiting = db.bookings.some((b) => b.showtimeId === showtimeId && b.status === "waiting");
  if (!hasWaiting) return false;
  matchShowtime(showtimeId);
  return true;
}

// Graceful exit: a matched person drops to a solo seat, no friction. If the
// group falls below two people, it dissolves and the last member goes solo too.
export function leaveGroup(bookingId: string): { ok: boolean; seatId?: string } {
  const booking = getBooking(bookingId);
  if (!booking || booking.status !== "matched" || !booking.groupId) return { ok: false };

  const showtime = getShowtime(booking.showtimeId)!;
  const seats = getSeats(booking.showtimeId);
  const seatById = new Map(seats.map((s) => [s.id, s]));

  // Release this person's held seat back to the pool.
  if (booking.seatId) {
    const old = seatById.get(booking.seatId);
    if (old && old.status === "held") old.status = "free";
  }

  const group = getGroup(booking.groupId);
  if (group) {
    group.bookingIds = group.bookingIds.filter((id) => id !== bookingId);
    group.seatIds = group.seatIds.filter((id) => id !== booking.seatId);
    if (group.bookingIds.length < 2) {
      for (const id of group.bookingIds) {
        const b = getBooking(id);
        if (b) {
          b.status = "solo";
          b.groupId = undefined;
        }
      }
      db.groups = db.groups.filter((gr) => gr.id !== group.id);
    }
  }

  // Give the leaver a fresh solo seat (an aisle one if they wanted it).
  const free = seats.filter((s) => s.status === "free");
  const aisle = free.find((s) => s.number === 1 || s.number === showtime.seatsPerRow);
  const chosen = (booking.aisleSeat && aisle) || free[0];
  booking.status = "left";
  booking.groupId = undefined;
  if (chosen) {
    booking.seatId = chosen.id;
    chosen.status = "held";
  } else {
    booking.seatId = undefined;
  }
  return { ok: true, seatId: booking.seatId };
}

// --- Theater dashboard ---------------------------------------------------

export interface ShowtimeYield {
  showtimeId: string;
  movieTitle: string;
  poster: string;
  auditorium: string;
  startsAt: string;
  totalSeats: number;
  sold: number;
  filledBySeatmate: number;
  free: number;
  groups: number;
  optedIn: number;
  upliftUsd: number;
}

export function theaterYield(): ShowtimeYield[] {
  return getShowtimes().map((s) => {
    const seats = getSeats(s.id);
    const held = seats.filter((x) => x.status === "held").length;
    const bookings = getBookings(s.id);
    const movie = getMovie(s.movieId)!;
    return {
      showtimeId: s.id,
      movieTitle: movie.title,
      poster: movie.poster,
      auditorium: s.auditorium,
      startsAt: s.startsAt,
      totalSeats: seats.length,
      sold: seats.filter((x) => x.status === "sold").length,
      filledBySeatmate: held,
      free: seats.filter((x) => x.status === "free").length,
      groups: db.groups.filter((gr) => gr.showtimeId === s.id).length,
      optedIn: bookings.filter((b) => b.status !== "left").length,
      upliftUsd: held * TICKET_PRICE,
    };
  });
}

export function seatmateInterestForBooking(bookingId: string): Interest[] {
  const b = getBooking(bookingId);
  if (!b?.groupId) return [];
  return getGroup(b.groupId)?.sharedInterests ?? [];
}
