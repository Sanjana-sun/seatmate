import { NextResponse } from "next/server";
import { getMovie, getSeats, getShowtimes, getBookings, runDueMatches } from "@/lib/store";

export async function GET() {
  runDueMatches(); // on-read scheduler (serverless-friendly)
  const showtimes = getShowtimes().map((s) => {
    const seats = getSeats(s.id);
    return {
      ...s,
      movie: getMovie(s.movieId),
      freeSeats: seats.filter((x) => x.status === "free").length,
      totalSeats: seats.length,
      waiting: getBookings(s.id).filter((b) => b.status === "waiting").length,
      optedIn: getBookings(s.id).length,
    };
  });
  return NextResponse.json({ showtimes });
}
