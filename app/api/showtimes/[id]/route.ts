import { NextResponse } from "next/server";
import { getBookings, getMovie, getSeats, getShowtime } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const showtime = getShowtime(id);
  if (!showtime) return NextResponse.json({ error: "not found" }, { status: 404 });

  const bookings = getBookings(id);
  return NextResponse.json({
    showtime,
    movie: getMovie(showtime.movieId),
    seats: getSeats(id),
    optedIn: bookings.length,
    waiting: bookings.filter((b) => b.status === "waiting").length,
  });
}
