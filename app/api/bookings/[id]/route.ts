import { NextResponse } from "next/server";
import { getBooking, getBookings, getGroup, getMovie, getShowtime, reputationOf, runDueMatchesFor } from "@/lib/store";

// A person's own view: their booking, and if matched, who they're sitting with.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let booking = getBooking(id);
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

  // On-read scheduler: if this showtime's auto-match window has arrived, run it
  // now. The match page polls this endpoint, so waiting users get matched
  // automatically even on serverless (no background timer).
  if (booking.status === "waiting" && runDueMatchesFor(booking.showtimeId)) {
    booking = getBooking(id)!;
  }

  const showtime = getShowtime(booking.showtimeId);
  const movie = showtime ? getMovie(showtime.movieId) : undefined;

  let seatmates: {
    userId: string;
    name: string;
    ageBand: string;
    vibe: string;
    seatId?: string;
    reputation: ReturnType<typeof reputationOf>;
  }[] = [];
  let sharedInterests: string[] = [];
  let iceBreaker: string | null = null;

  if (booking.groupId) {
    const group = getGroup(booking.groupId);
    if (group) {
      sharedInterests = group.sharedInterests;
      iceBreaker = group.iceBreaker;
      const all = getBookings(booking.showtimeId);
      seatmates = group.bookingIds
        .filter((bid) => bid !== booking.id)
        .map((bid) => all.find((b) => b.id === bid))
        .filter((b): b is NonNullable<typeof b> => Boolean(b))
        .map((b) => ({
          userId: b.userId,
          name: b.name,
          ageBand: b.ageBand,
          vibe: b.vibe,
          seatId: b.seatId,
          reputation: reputationOf(b.userId),
        }));
    }
  }

  return NextResponse.json({
    booking,
    showtime,
    movie,
    reputation: reputationOf(booking.userId),
    seatmates,
    sharedInterests,
    iceBreaker,
  });
}
