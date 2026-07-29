"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { useRequireUser } from "@/lib/useUser";

interface ShowtimeRow {
  id: string;
  auditorium: string;
  startsAt: string;
  movie: { title: string; poster: string; rating: string; runtimeMins: number };
  freeSeats: number;
  optedIn: number;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ShowtimesPage() {
  const { user, loading } = useRequireUser();
  const [showtimes, setShowtimes] = useState<ShowtimeRow[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/showtimes");
    if (res.ok) setShowtimes((await res.json()).showtimes);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (loading || !user) return <main className="p-10 text-muted">Loading…</main>;

  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-5 py-12">
        <p className="text-sm text-muted">Welcome, {user.name}.</p>
        <h1 className="display mt-2 text-5xl">Tonight&apos;s showtimes</h1>
        <p className="mt-3 max-w-xl text-muted">
          Pick a show and opt in. We&apos;ll match you with a compatible seatmate from the other
          solo-goers and sit you together.
        </p>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {showtimes.map((s) => (
            <Link key={s.id} href={`/showtime/${s.id}`} className="group bg-background p-6 transition hover:bg-panel-2">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-lg border border-border text-3xl">{s.movie.poster}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-lg font-semibold tracking-tight">{s.movie.title}</h3>
                    <span className="shrink-0 font-mono text-sm">{timeLabel(s.startsAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {s.auditorium} · {s.movie.rating} · {s.movie.runtimeMins} min
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border px-2.5 py-1 text-muted">{s.freeSeats} seats open</span>
                    <span className="rounded-full bg-foreground px-2.5 py-1 text-background">{s.optedIn} looking for a seatmate</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
