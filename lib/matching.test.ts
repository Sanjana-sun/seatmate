import { test } from "node:test";
import assert from "node:assert/strict";
import { compatibility, runMatching, sharedInterests } from "./matching.ts";
import type { Booking, Interest, Seat } from "./types.ts";

let seq = 0;
function booking(over: Partial<Booking> = {}): Booking {
  seq += 1;
  return {
    id: `b${seq}`,
    userId: `u${seq}`,
    showtimeId: "s1",
    name: `P${seq}`,
    gender: "female",
    ageBand: "25-34",
    vibe: "chatty",
    genderPref: "any",
    maxGroupSize: 4,
    interests: [],
    aisleSeat: false,
    createdAt: new Date(2000, 0, 1, 0, 0, seq).toISOString(), // stable order
    status: "waiting",
    ...over,
  };
}

// A full row of free seats, numbered 1..n.
function row(letter: string, n: number): Seat[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${letter}${i + 1}`, row: letter, number: i + 1, status: "free" as const }));
}

const opts = { seatsPerRow: 12 };

test("gender 'same' preference is a hard constraint both ways", () => {
  const a = booking({ gender: "female", genderPref: "same" });
  const b = booking({ gender: "male", genderPref: "any" });
  assert.equal(compatibility(a, b), null);
  assert.equal(compatibility(b, a), null); // symmetric
});

test("quiet and friendly are never paired", () => {
  const a = booking({ vibe: "quiet" });
  const b = booking({ vibe: "friendly" });
  assert.equal(compatibility(a, b), null);
});

test("shared interests raise the score", () => {
  const tags: Interest[] = ["Horror", "Sci-fi"];
  const a = booking({ interests: tags });
  const b = booking({ interests: tags });
  const c = booking({ interests: [] });
  assert.equal(sharedInterests(a, b).length, 2);
  assert.ok((compatibility(a, b) as number) > (compatibility(a, c) as number));
});

test("matched groups get adjacent seats in one row", () => {
  const people = [booking(), booking(), booking()];
  const res = runMatching(people, row("A", 12), opts);
  assert.equal(res.groups.length, 1);
  const seatNums = res.groups[0].seatIds.map((id) => Number(id.slice(1))).sort((x, y) => x - y);
  assert.deepEqual(seatNums, [1, 2, 3]); // consecutive
});

test("group size never exceeds the smallest member's cap", () => {
  const people = [booking({ maxGroupSize: 2 }), booking({ maxGroupSize: 2 }), booking({ maxGroupSize: 4 })];
  const res = runMatching(people, row("A", 12), opts);
  // The first pair fills at 2; the third is left to sit solo.
  assert.equal(res.groups.length, 1);
  assert.equal(res.groups[0].bookingIds.length, 2);
  assert.equal(res.solos.length, 1);
});

test("incompatible loner is seated solo, not dropped", () => {
  const women = [
    booking({ gender: "female", genderPref: "same", vibe: "chatty" }),
    booking({ gender: "female", genderPref: "same", vibe: "chatty" }),
  ];
  const loner = booking({ gender: "male", vibe: "quiet", genderPref: "any" });
  const res = runMatching([...women, loner], row("A", 12), opts);
  assert.equal(res.groups.length, 1);
  assert.equal(res.solos.length, 1);
  assert.equal(res.solos[0].bookingId, loner.id);
  assert.ok(res.solos[0].seatId); // still got a seat
});

test("blocked users are seated but never matched", () => {
  const a = booking();
  const b = booking();
  const blocked = new Set([b.userId]);
  const res = runMatching([a, b], row("A", 12), { ...opts, blockedUserIds: blocked });
  assert.equal(res.groups.length, 0);
  assert.equal(res.solos.length, 2);
});

test("aisle preference places a group touching an aisle", () => {
  // Row A seats 2..12 free (no aisle seat 1); Row B fully free (has seat 1).
  const a = row("A", 12).filter((s) => s.number >= 2);
  const b = row("B", 12);
  const people = [booking({ aisleSeat: true }), booking({ aisleSeat: false })];
  const res = runMatching(people, [...a, ...b], opts);
  const nums = res.groups[0].seatIds.map((id) => ({ row: id[0], n: Number(id.slice(1)) }));
  assert.ok(nums.some((s) => s.n === 1 || s.n === 12), "group should include an aisle seat");
});

test("runs out of seats gracefully", () => {
  const people = [booking(), booking(), booking()];
  const res = runMatching(people, row("A", 2), opts); // only 2 seats for 3 people
  const seated = res.groups.flatMap((g) => g.seatIds).length + res.solos.filter((s) => s.seatId).length;
  assert.equal(seated, 2);
  assert.equal(res.unseated.length, 1);
});
