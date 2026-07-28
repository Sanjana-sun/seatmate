import { NextResponse } from "next/server";
import { getShowtime, matchShowtime } from "@/lib/store";

// The theater (or a scheduled job near showtime) triggers this to run the
// matcher over everyone who opted in, and seat the groups.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const showtimeId = body?.showtimeId;
  if (!getShowtime(showtimeId)) return NextResponse.json({ error: "unknown showtime" }, { status: 400 });

  const summary = matchShowtime(showtimeId);
  return NextResponse.json({ summary });
}
