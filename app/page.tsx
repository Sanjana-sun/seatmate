import Link from "next/link";
import { getBookings, getMovie, getSeats, getShowtimes } from "@/lib/store";

export const dynamic = "force-dynamic";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Home() {
  const showtimes = getShowtimes().map((s) => {
    const seats = getSeats(s.id);
    const bookings = getBookings(s.id);
    return {
      ...s,
      movie: getMovie(s.movieId)!,
      free: seats.filter((x) => x.status === "free").length,
      optedIn: bookings.length,
    };
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <header className="mb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-accent">
            <span className="text-lg">🎬</span> SeatMate
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/rally" className="transition hover:text-foreground">
              Rally a showing
            </Link>
            <Link href="/theater" className="transition hover:text-foreground">
              For theaters
            </Link>
          </nav>
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Never watch <span className="text-accent">alone</span>.
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Going to a movie by yourself? Opt in and we&apos;ll match you with a compatible
          seatmate from the other solo-goers, then sit you together in the seats the
          theater hasn&apos;t sold. Watch your movie, maybe make a friend.
        </p>
      </header>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
        Tonight&apos;s showtimes
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {showtimes.map((s) => (
          <Link
            key={s.id}
            href={`/showtime/${s.id}`}
            className="group rounded-2xl border border-white/10 bg-panel p-5 transition hover:border-accent/50 hover:bg-panel-2"
          >
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-panel-2 text-3xl">
                {s.movie.poster}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-lg font-semibold">{s.movie.title}</h3>
                  <span className="shrink-0 text-accent">{timeLabel(s.startsAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {s.auditorium} · {s.movie.rating} · {s.movie.runtimeMins} min
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-muted">
                    {s.free} seats open
                  </span>
                  <span className="rounded-full bg-accent-2/15 px-2.5 py-1 text-accent-2">
                    {s.optedIn} looking for a seatmate
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted">
        Demo · the matcher only ever uses seats the theater hasn&apos;t sold.
      </p>
    </main>
  );
}
