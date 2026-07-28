import { NextResponse } from "next/server";
import { addOrSupportRally, getMovie, getMovies, getRallies } from "@/lib/store";

const GENDERS = ["female", "male", "nonbinary"];

export async function GET() {
  const rallies = getRallies()
    .map((r) => ({ ...r, movie: getMovie(r.movieId), supporters: r.supporterIds.length }))
    .sort((a, b) => b.supporters - a.supporters);
  return NextResponse.json({ rallies, movies: getMovies() });
}

// Back a not-yet-scheduled showing. Enough backers and the theater can
// schedule it, turning would-be-empty inventory into sales.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { movieId, window, name, gender } = body ?? {};
  if (!getMovie(movieId)) return NextResponse.json({ error: "unknown movie" }, { status: 400 });
  if (typeof window !== "string" || !window.trim()) return NextResponse.json({ error: "window required" }, { status: 400 });
  if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!GENDERS.includes(gender)) return NextResponse.json({ error: "invalid gender" }, { status: 400 });

  const rally = addOrSupportRally(movieId, window.trim().slice(0, 40), name.trim().slice(0, 40), gender);
  return NextResponse.json({ rally: { ...rally, supporters: rally.supporterIds.length } });
}
