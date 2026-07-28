// Domain model for SeatMate.
// The theater owns ticketing; we only ever touch UNSOLD seats for a showtime.

export type Vibe = "quiet" | "chatty" | "friendly";
// quiet    = here to watch, minimal talk
// chatty   = happy to chat before / after the movie
// friendly = open to actually making a friend

export type AgeBand = "18-24" | "25-34" | "35-49" | "50+";

export type Gender = "female" | "male" | "nonbinary";

export type GenderPref = "same" | "any";
// "same" = only match me with people of my same gender (a safety option)

// A fixed taste vocabulary. Shared tags boost compatibility and seed the
// ice-breaker on the match page.
export const INTEREST_TAGS = [
  "A24 / indie",
  "Blockbusters",
  "Horror",
  "Sci-fi",
  "Rom-com",
  "Anime",
  "Documentary",
  "Foodie",
  "Bookworm",
  "Gamer",
  "Live music",
  "Sports",
] as const;
export type Interest = (typeof INTEREST_TAGS)[number];

export type SeatStatus = "sold" | "free" | "held";
// sold = a normal (non-matching) buyer already has it
// free = available inventory the matcher may use
// held = assigned by the matcher to a group

export interface Seat {
  id: string;       // e.g. "C7"
  row: string;      // "C"
  number: number;   // 7
  status: SeatStatus;
}

export interface Showtime {
  id: string;
  movieId: string;
  startsAt: string;    // ISO
  autoMatchAt: string; // ISO: when the scheduler auto-runs the matcher
  auditorium: string;
  rows: string[];      // ["A".."H"]
  seatsPerRow: number;
}

export interface Movie {
  id: string;
  title: string;
  runtimeMins: number;
  rating: string;
  poster: string;     // emoji stand-in for the demo
  blurb: string;
}

// A person, tracked across showtimes so reputation compounds. In a real app
// this is the authenticated account; here we key it by name for the demo.
export interface User {
  id: string;
  name: string;
  gender: Gender;
  verified: boolean;    // completed a (simulated) ID check
  ratingSum: number;
  ratingCount: number;
  reportCount: number;
}

export type BookingStatus = "waiting" | "matched" | "solo" | "left";
// waiting = opted in, matcher hasn't run yet
// matched = grouped with at least one other person
// solo    = matcher ran but no compatible partner; seated on their own
// left    = used the graceful exit and dropped to a solo seat

export interface Booking {
  id: string;
  userId: string;
  showtimeId: string;
  name: string;
  gender: Gender;
  ageBand: AgeBand;
  vibe: Vibe;
  genderPref: GenderPref;
  maxGroupSize: 2 | 3 | 4;
  interests: Interest[];
  aisleSeat: boolean;   // wants an aisle seat (easy exit)
  createdAt: string;

  // filled in by the matcher
  status: BookingStatus;
  groupId?: string;
  seatId?: string;
}

export interface Group {
  id: string;
  showtimeId: string;
  bookingIds: string[];
  seatIds: string[];
  sharedInterests: Interest[];
  iceBreaker: string;
}

// A grassroots request to schedule a showing that doesn't exist yet. When
// enough solo-goers back one, the theater can turn empty inventory into sales.
export interface Rally {
  id: string;
  movieId: string;
  window: string;        // e.g. "This weekend, evening"
  supporterIds: string[];
  createdAt: string;
}
