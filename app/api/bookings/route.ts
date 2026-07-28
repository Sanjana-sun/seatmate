import { NextResponse } from "next/server";
import { addBooking, getShowtime, reputationOf } from "@/lib/store";
import { INTEREST_TAGS } from "@/lib/types";
import type { AgeBand, Gender, GenderPref, Interest, Vibe } from "@/lib/types";

const VIBES: Vibe[] = ["quiet", "chatty", "friendly"];
const AGE_BANDS: AgeBand[] = ["18-24", "25-34", "35-49", "50+"];
const GENDERS: Gender[] = ["female", "male", "nonbinary"];
const GENDER_PREFS: GenderPref[] = ["same", "any"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { showtimeId, name, gender, ageBand, vibe, genderPref, maxGroupSize, interests, aisleSeat } = body;

  if (!getShowtime(showtimeId)) return NextResponse.json({ error: "unknown showtime" }, { status: 400 });
  if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!GENDERS.includes(gender)) return NextResponse.json({ error: "invalid gender" }, { status: 400 });
  if (!AGE_BANDS.includes(ageBand)) return NextResponse.json({ error: "invalid ageBand" }, { status: 400 });
  if (!VIBES.includes(vibe)) return NextResponse.json({ error: "invalid vibe" }, { status: 400 });
  if (!GENDER_PREFS.includes(genderPref)) return NextResponse.json({ error: "invalid genderPref" }, { status: 400 });
  if (![2, 3, 4].includes(maxGroupSize)) return NextResponse.json({ error: "invalid maxGroupSize" }, { status: 400 });

  const cleanInterests: Interest[] = Array.isArray(interests)
    ? (interests.filter((i: unknown) => INTEREST_TAGS.includes(i as Interest)) as Interest[]).slice(0, 6)
    : [];

  const booking = addBooking({
    showtimeId,
    name: name.trim().slice(0, 40),
    gender,
    ageBand,
    vibe,
    genderPref,
    maxGroupSize,
    interests: cleanInterests,
    aisleSeat: Boolean(aisleSeat),
  });

  return NextResponse.json({ booking, reputation: reputationOf(booking.userId) });
}
