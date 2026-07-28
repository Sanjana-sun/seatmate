import { NextResponse } from "next/server";
import { getMovie, getRallies, theaterYield } from "@/lib/store";

// The B2B view: how many otherwise-empty seats SeatMate turned into sales,
// plus grassroots demand (rallies) the theater could schedule against.
export async function GET() {
  const rows = theaterYield();
  const totals = rows.reduce(
    (acc, r) => {
      acc.filled += r.filledBySeatmate;
      acc.uplift += r.upliftUsd;
      acc.optedIn += r.optedIn;
      acc.groups += r.groups;
      return acc;
    },
    { filled: 0, uplift: 0, optedIn: 0, groups: 0 },
  );

  const rallies = getRallies()
    .map((r) => ({ movie: getMovie(r.movieId)?.title ?? "?", window: r.window, supporters: r.supporterIds.length }))
    .sort((a, b) => b.supporters - a.supporters);

  return NextResponse.json({ rows, totals, rallies });
}
