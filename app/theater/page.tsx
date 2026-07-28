"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Row {
  showtimeId: string;
  movieTitle: string;
  poster: string;
  auditorium: string;
  startsAt: string;
  totalSeats: number;
  sold: number;
  filledBySeatmate: number;
  free: number;
  groups: number;
  optedIn: number;
  upliftUsd: number;
}
interface Data {
  rows: Row[];
  totals: { filled: number; uplift: number; optedIn: number; groups: number };
  rallies: { movie: string; window: string; supporters: number }[];
}

export default function TheaterPage() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/theater");
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function runMatch(showtimeId: string) {
    setBusy(showtimeId);
    await fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ showtimeId }),
    });
    setBusy(null);
    load();
  }

  if (!data) return <main className="mx-auto max-w-4xl px-5 py-10 text-muted">Loading…</main>;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Back to SeatMate
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Theater dashboard</h1>
      <p className="mt-1 text-muted">Seats SeatMate turned into sales from your unsold inventory.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Seats filled" value={data.totals.filled} />
        <Stat label="Revenue uplift" value={`$${data.totals.uplift}`} accent />
        <Stat label="Groups formed" value={data.totals.groups} />
        <Stat label="Solo-goers opted in" value={data.totals.optedIn} />
      </div>

      <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wide text-muted">By showtime</h2>
      <div className="space-y-3">
        {data.rows.map((r) => {
          const occ = Math.round(((r.sold + r.filledBySeatmate) / r.totalSeats) * 100);
          return (
            <div key={r.showtimeId} className="rounded-2xl border border-white/10 bg-panel p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-panel-2 text-2xl">{r.poster}</div>
                <div className="flex-1">
                  <p className="font-semibold">{r.movieTitle}</p>
                  <p className="text-xs text-muted">
                    {r.auditorium} · {new Date(r.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <button
                  onClick={() => runMatch(r.showtimeId)}
                  disabled={busy === r.showtimeId}
                  className="rounded-lg border border-accent-2/50 bg-accent-2/15 px-3 py-1.5 text-sm font-medium text-accent-2 transition hover:bg-accent-2/25 disabled:opacity-50"
                >
                  {busy === r.showtimeId ? "Matching…" : "Run matching"}
                </button>
              </div>

              <div className="mt-4">
                <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
                  <div className="bg-white/25" style={{ width: `${(r.sold / r.totalSeats) * 100}%` }} title="Sold normally" />
                  <div className="bg-accent" style={{ width: `${(r.filledBySeatmate / r.totalSeats) * 100}%` }} title="Filled by SeatMate" />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>{occ}% occupancy</span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-[2px] bg-white/25" /> {r.sold} sold
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-[2px] bg-accent" /> {r.filledBySeatmate} via SeatMate (+${r.upliftUsd})
                  </span>
                  <span>{r.free} still open</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.rallies.length > 0 && (
        <>
          <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Demand to schedule (from rallies)
          </h2>
          <div className="space-y-2">
            {data.rallies.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-panel p-3 text-sm">
                <span>
                  <span className="font-medium">{r.movie}</span> <span className="text-muted">· {r.window}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs ${r.supporters >= 8 ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-muted"}`}>
                  {r.supporters} backing{r.supporters >= 8 ? " · schedule it" : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <p className={`text-2xl font-bold ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
