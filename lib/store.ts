// SQLite-backed store (Node's built-in node:sqlite, no native deps).
// Every accessor keeps the same signature the app already uses, so pages and
// API routes are unchanged. The DB file lives at ./seatmate.db and persists
// across restarts. A globalThis singleton avoids reopening on hot-reload.

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { Booking, Group, Interest, Movie, Rally, Seat, Showtime, User } from "./types";
import { commonIceBreaker } from "./icebreakers";
import { runMatching } from "./matching";

const TICKET_PRICE = 14; // used for the theater's revenue-uplift estimate

// --- Connection + schema -------------------------------------------------

const g = globalThis as unknown as { __seatmateDb?: DatabaseSync };

function openDb(): DatabaseSync {
  const db = new DatabaseSync(path.join(process.cwd(), "seatmate.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY, title TEXT, runtime_mins INTEGER, rating TEXT, poster TEXT, blurb TEXT
    );
    CREATE TABLE IF NOT EXISTS showtimes (
      id TEXT PRIMARY KEY, movie_id TEXT, starts_at TEXT, auto_match_at TEXT,
      auditorium TEXT, rows_json TEXT, seats_per_row INTEGER
    );
    CREATE TABLE IF NOT EXISTS seats (
      st_id TEXT, seat_id TEXT, seat_row TEXT, seat_num INTEGER, status TEXT,
      PRIMARY KEY (st_id, seat_id)
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT, gender TEXT, verified INTEGER,
      rating_sum INTEGER, rating_count INTEGER, report_count INTEGER
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, user_id TEXT, showtime_id TEXT, name TEXT, gender TEXT,
      age_band TEXT, vibe TEXT, gender_pref TEXT, max_group_size INTEGER,
      interests_json TEXT, aisle_seat INTEGER, created_at TEXT, status TEXT,
      group_id TEXT, seat_id TEXT
    );
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY, showtime_id TEXT, booking_ids_json TEXT,
      seat_ids_json TEXT, shared_interests_json TEXT, ice_breaker TEXT
    );
    CREATE TABLE IF NOT EXISTS rallies (
      id TEXT PRIMARY KEY, movie_id TEXT, window TEXT, supporter_ids_json TEXT, created_at TEXT
    );
  `);
  return db;
}

// --- Seed ----------------------------------------------------------------

const MOVIES: Movie[] = [
  { id: "m1", title: "Neon Tide", runtimeMins: 118, rating: "PG-13", poster: "🌊", blurb: "A synth-soaked heist across a drowned city." },
  { id: "m2", title: "The Quiet Orbit", runtimeMins: 132, rating: "PG", poster: "🛰️", blurb: "Two strangers stranded on a failing space station." },
  { id: "m3", title: "Paper Lanterns", runtimeMins: 104, rating: "PG-13", poster: "🏮", blurb: "A tender festival romance told over one long night." },
  { id: "m4", title: "Grain & Ash", runtimeMins: 96, rating: "R", poster: "🌾", blurb: "A slow-burn Western about the last honest sheriff." },
];

// Showtimes are seeded relative to "now" so a live demo always has one whose
// auto-match window is imminent (the scheduler fires within a tick) while the
// others are still comfortably in the future.
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

function seedIfEmpty(database: DatabaseSync) {
  const count = database.prepare("SELECT COUNT(*) AS c FROM movies").get() as { c: number };
  if (count.c > 0) return;

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const perRow = 12;
  // Minutes-from-now start times. s4 starts in 15 min so its auto-match window
  // (start - 15 min) is due immediately, demonstrating the scheduler live.
  const showtimes: (Omit<Showtime, "autoMatchAt"> & { sold: number })[] = [
    { id: "s4", movieId: "m3", startsAt: inMinutes(15), auditorium: "Hall 4", rows, seatsPerRow: perRow, sold: 0.25 },
    { id: "s1", movieId: "m1", startsAt: inMinutes(50), auditorium: "Hall 1", rows, seatsPerRow: perRow, sold: 0.55 },
    { id: "s3", movieId: "m2", startsAt: inMinutes(95), auditorium: "Hall 2", rows, seatsPerRow: perRow, sold: 0.6 },
    { id: "s2", movieId: "m1", startsAt: inMinutes(150), auditorium: "Hall 3", rows, seatsPerRow: perRow, sold: 0.35 },
  ];

  const insMovie = database.prepare("INSERT INTO movies VALUES (?,?,?,?,?,?)");
  for (const m of MOVIES) insMovie.run(m.id, m.title, m.runtimeMins, m.rating, m.poster, m.blurb);

  const insShow = database.prepare("INSERT INTO showtimes VALUES (?,?,?,?,?,?,?)");
  const insSeat = database.prepare("INSERT INTO seats VALUES (?,?,?,?,?)");
  for (const s of showtimes) {
    insShow.run(s.id, s.movieId, s.startsAt, minusMinutes(s.startsAt, 15), s.auditorium, JSON.stringify(rows), perRow);
    for (const seat of seatMapFor(s.id, rows, perRow, s.sold)) {
      insSeat.run(s.id, seat.id, seat.row, seat.number, seat.status);
    }
  }
}

// Open + seed once (after all seed helpers above are initialized).
if (!g.__seatmateDb) {
  g.__seatmateDb = openDb();
  seedIfEmpty(g.__seatmateDb);
}
const db = g.__seatmateDb;

// --- Row mappers ---------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function toMovie(r: any): Movie {
  return { id: r.id, title: r.title, runtimeMins: r.runtime_mins, rating: r.rating, poster: r.poster, blurb: r.blurb };
}
function toShowtime(r: any): Showtime {
  return {
    id: r.id, movieId: r.movie_id, startsAt: r.starts_at, autoMatchAt: r.auto_match_at,
    auditorium: r.auditorium, rows: JSON.parse(r.rows_json), seatsPerRow: r.seats_per_row,
  };
}
function toSeat(r: any): Seat {
  return { id: r.seat_id, row: r.seat_row, number: r.seat_num, status: r.status };
}
function toUser(r: any): User {
  return {
    id: r.id, name: r.name, gender: r.gender, verified: !!r.verified,
    ratingSum: r.rating_sum, ratingCount: r.rating_count, reportCount: r.report_count,
  };
}
function toBooking(r: any): Booking {
  return {
    id: r.id, userId: r.user_id, showtimeId: r.showtime_id, name: r.name, gender: r.gender,
    ageBand: r.age_band, vibe: r.vibe, genderPref: r.gender_pref, maxGroupSize: r.max_group_size,
    interests: JSON.parse(r.interests_json), aisleSeat: !!r.aisle_seat, createdAt: r.created_at,
    status: r.status, groupId: r.group_id ?? undefined, seatId: r.seat_id ?? undefined,
  };
}
function toGroup(r: any): Group {
  return {
    id: r.id, showtimeId: r.showtime_id, bookingIds: JSON.parse(r.booking_ids_json),
    seatIds: JSON.parse(r.seat_ids_json), sharedInterests: JSON.parse(r.shared_interests_json),
    iceBreaker: r.ice_breaker,
  };
}
function toRally(r: any): Rally {
  return { id: r.id, movieId: r.movie_id, window: r.window, supporterIds: JSON.parse(r.supporter_ids_json), createdAt: r.created_at };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
  const u = getUser(userId);
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
  const users = (db.prepare("SELECT * FROM users").all() as unknown[]).map(toUser);
  return new Set(users.filter((u) => reputationOf(u.id).blocked).map((u) => u.id));
}

// --- Accessors -----------------------------------------------------------

export function getMovies(): Movie[] {
  return (db.prepare("SELECT * FROM movies").all() as unknown[]).map(toMovie);
}
export function getMovie(id: string): Movie | undefined {
  const r = db.prepare("SELECT * FROM movies WHERE id=?").get(id);
  return r ? toMovie(r) : undefined;
}
export function getShowtimes(): Showtime[] {
  return (db.prepare("SELECT * FROM showtimes ORDER BY starts_at").all() as unknown[]).map(toShowtime);
}
export function getShowtime(id: string): Showtime | undefined {
  const r = db.prepare("SELECT * FROM showtimes WHERE id=?").get(id);
  return r ? toShowtime(r) : undefined;
}
export function getSeats(showtimeId: string): Seat[] {
  return (db.prepare("SELECT * FROM seats WHERE st_id=? ORDER BY seat_row, seat_num").all(showtimeId) as unknown[]).map(toSeat);
}
export function getBookings(showtimeId: string): Booking[] {
  return (db.prepare("SELECT * FROM bookings WHERE showtime_id=? ORDER BY created_at").all(showtimeId) as unknown[]).map(toBooking);
}
export function getBooking(id: string): Booking | undefined {
  const r = db.prepare("SELECT * FROM bookings WHERE id=?").get(id);
  return r ? toBooking(r) : undefined;
}
export function getGroup(id: string): Group | undefined {
  const r = db.prepare("SELECT * FROM groups WHERE id=?").get(id);
  return r ? toGroup(r) : undefined;
}
export function getUser(id: string): User | undefined {
  const r = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  return r ? toUser(r) : undefined;
}

// Demo simplification: a "returning" user is identified by exact name.
function findOrCreateUser(name: string, gender: User["gender"]): User {
  const existing = db.prepare("SELECT * FROM users WHERE lower(name)=lower(?)").get(name);
  if (existing) return toUser(existing);
  const user: User = { id: rid("u"), name, gender, verified: false, ratingSum: 0, ratingCount: 0, reportCount: 0 };
  db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?)").run(user.id, user.name, user.gender, 0, 0, 0, 0);
  return user;
}

export function verifyUser(userId: string): boolean {
  const info = db.prepare("UPDATE users SET verified=1 WHERE id=?").run(userId);
  return info.changes > 0;
}

export function addBooking(input: Omit<Booking, "id" | "userId" | "createdAt" | "status">): Booking {
  const user = findOrCreateUser(input.name, input.gender);
  const booking: Booking = { ...input, userId: user.id, id: rid("b"), createdAt: new Date().toISOString(), status: "waiting" };
  db.prepare(
    `INSERT INTO bookings (id,user_id,showtime_id,name,gender,age_band,vibe,gender_pref,max_group_size,interests_json,aisle_seat,created_at,status,group_id,seat_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)`,
  ).run(
    booking.id, booking.userId, booking.showtimeId, booking.name, booking.gender, booking.ageBand,
    booking.vibe, booking.genderPref, booking.maxGroupSize, JSON.stringify(booking.interests),
    booking.aisleSeat ? 1 : 0, booking.createdAt, booking.status,
  );
  return booking;
}

// --- Ratings & reports ---------------------------------------------------

export function rateUser(userId: string, stars: number): boolean {
  if (stars < 1 || stars > 5 || !getUser(userId)) return false;
  db.prepare("UPDATE users SET rating_sum=rating_sum+?, rating_count=rating_count+1 WHERE id=?").run(stars, userId);
  return true;
}

export function reportUser(userId: string): boolean {
  const info = db.prepare("UPDATE users SET report_count=report_count+1 WHERE id=?").run(userId);
  return info.changes > 0;
}

// --- Rallies -------------------------------------------------------------

export function getRallies(): Rally[] {
  return (db.prepare("SELECT * FROM rallies").all() as unknown[]).map(toRally);
}

export function addOrSupportRally(movieId: string, window: string, supporterName: string, gender: User["gender"]): Rally {
  const user = findOrCreateUser(supporterName, gender);
  const existingRow = db.prepare("SELECT * FROM rallies WHERE movie_id=? AND window=?").get(movieId, window);
  if (existingRow) {
    const rally = toRally(existingRow);
    if (!rally.supporterIds.includes(user.id)) {
      rally.supporterIds.push(user.id);
      db.prepare("UPDATE rallies SET supporter_ids_json=? WHERE id=?").run(JSON.stringify(rally.supporterIds), rally.id);
    }
    return rally;
  }
  const rally: Rally = { id: rid("r"), movieId, window, supporterIds: [user.id], createdAt: new Date().toISOString() };
  db.prepare("INSERT INTO rallies VALUES (?,?,?,?,?)").run(rally.id, rally.movieId, rally.window, JSON.stringify(rally.supporterIds), rally.createdAt);
  return rally;
}

// --- Matching ------------------------------------------------------------

export function matchShowtime(showtimeId: string): { matched: number; groups: number; solos: number } {
  const showtime = getShowtime(showtimeId);
  if (!showtime) return { matched: 0, groups: 0, solos: 0 };

  const seats = getSeats(showtimeId);
  const bookings = getBookings(showtimeId).filter((b) => b.status !== "left");

  // Release seats the matcher held on a previous run; keep truly-sold ones.
  db.prepare("UPDATE seats SET status='free' WHERE st_id=? AND status='held'").run(showtimeId);
  db.prepare("UPDATE bookings SET status='waiting', group_id=NULL, seat_id=NULL WHERE showtime_id=? AND status!='left'").run(showtimeId);
  db.prepare("DELETE FROM groups WHERE showtime_id=?").run(showtimeId);

  // Reflect the release in our local copy before planning.
  for (const s of seats) if (s.status === "held") s.status = "free";
  for (const b of bookings) {
    b.status = "waiting";
    b.groupId = undefined;
    b.seatId = undefined;
  }

  const result = runMatching(bookings, seats, { seatsPerRow: showtime.seatsPerRow, blockedUserIds: blockedUserIds() });

  const setHeld = db.prepare("UPDATE seats SET status='held' WHERE st_id=? AND seat_id=?");
  const setBooking = db.prepare("UPDATE bookings SET status=?, group_id=?, seat_id=? WHERE id=?");
  const insGroup = db.prepare("INSERT INTO groups VALUES (?,?,?,?,?,?)");

  for (const grp of result.groups) {
    const groupId = rid("g");
    insGroup.run(
      groupId, showtimeId, JSON.stringify(grp.bookingIds), JSON.stringify(grp.seatIds),
      JSON.stringify(grp.sharedInterests), commonIceBreaker(grp.sharedInterests),
    );
    grp.bookingIds.forEach((bid, i) => {
      setBooking.run("matched", groupId, grp.seatIds[i], bid);
    });
    for (const sid of grp.seatIds) setHeld.run(showtimeId, sid);
  }

  for (const solo of result.solos) {
    setBooking.run("solo", null, solo.seatId ?? null, solo.bookingId);
    if (solo.seatId) setHeld.run(showtimeId, solo.seatId);
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
  const now = new Date().toISOString();
  const due = db.prepare("SELECT id FROM showtimes WHERE auto_match_at<=?").all(now) as { id: string }[];
  const ran: string[] = [];
  for (const { id } of due) {
    const waiting = db.prepare("SELECT COUNT(*) AS c FROM bookings WHERE showtime_id=? AND status='waiting'").get(id) as { c: number };
    if (waiting.c > 0) {
      matchShowtime(id);
      ran.push(id);
    }
  }
  return ran;
}

// Graceful exit: a matched person drops to a solo seat, no friction. If the
// group falls below two people, it dissolves and the last member goes solo too.
export function leaveGroup(bookingId: string): { ok: boolean; seatId?: string } {
  const booking = getBooking(bookingId);
  if (!booking || booking.status !== "matched" || !booking.groupId) return { ok: false };

  const showtime = getShowtime(booking.showtimeId)!;

  // Release this person's held seat back to the pool.
  if (booking.seatId) {
    db.prepare("UPDATE seats SET status='free' WHERE st_id=? AND seat_id=? AND status='held'").run(booking.showtimeId, booking.seatId);
  }

  const group = getGroup(booking.groupId);
  if (group) {
    group.bookingIds = group.bookingIds.filter((id) => id !== bookingId);
    group.seatIds = group.seatIds.filter((id) => id !== booking.seatId);
    if (group.bookingIds.length < 2) {
      for (const id of group.bookingIds) {
        db.prepare("UPDATE bookings SET status='solo', group_id=NULL WHERE id=?").run(id);
      }
      db.prepare("DELETE FROM groups WHERE id=?").run(group.id);
    } else {
      db.prepare("UPDATE groups SET booking_ids_json=?, seat_ids_json=? WHERE id=?").run(
        JSON.stringify(group.bookingIds), JSON.stringify(group.seatIds), group.id,
      );
    }
  }

  // Give the leaver a fresh solo seat (an aisle one if they wanted it).
  const free = getSeats(booking.showtimeId).filter((s) => s.status === "free");
  const aisle = free.find((s) => s.number === 1 || s.number === showtime.seatsPerRow);
  const chosen = (booking.aisleSeat && aisle) || free[0];
  if (chosen) {
    db.prepare("UPDATE bookings SET status='left', group_id=NULL, seat_id=? WHERE id=?").run(chosen.id, bookingId);
    db.prepare("UPDATE seats SET status='held' WHERE st_id=? AND seat_id=?").run(booking.showtimeId, chosen.id);
    return { ok: true, seatId: chosen.id };
  }
  db.prepare("UPDATE bookings SET status='left', group_id=NULL, seat_id=NULL WHERE id=?").run(bookingId);
  return { ok: true, seatId: undefined };
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
    const groups = db.prepare("SELECT COUNT(*) AS c FROM groups WHERE showtime_id=?").get(s.id) as { c: number };
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
      groups: groups.c,
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
