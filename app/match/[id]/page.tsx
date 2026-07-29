"use client";

import { use, useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";

interface Rep {
  avg: number | null;
  count: number;
  label: "new" | "trusted" | "watch" | "blocked";
}
interface Seatmate {
  userId: string;
  name: string;
  ageBand: string;
  vibe: string;
  seatId?: string;
  reputation: Rep;
}
interface MatchData {
  booking: { id: string; name: string; vibe: string; status: "waiting" | "matched" | "solo" | "left"; seatId?: string };
  showtime?: { auditorium: string; startsAt: string; autoMatchAt: string };
  movie?: { title: string; poster: string };
  reputation: Rep;
  seatmates: Seatmate[];
  sharedInterests: string[];
  iceBreaker: string | null;
}

const VIBE_LABEL: Record<string, string> = {
  quiet: "just here to watch",
  chatty: "happy to chat",
  friendly: "up for a new friend",
};

// The scheduler ticks every ~10s; describe when auto-matching happens.
function autoMatchLabel(autoMatchAt: string): string {
  const diffMin = Math.round((new Date(autoMatchAt).getTime() - Date.now()) / 60000);
  if (diffMin <= 0) return "any moment now";
  if (diffMin < 60) return `in about ${diffMin} min`;
  const t = new Date(autoMatchAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `at ${t}`;
}

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<MatchData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/bookings/${id}`);
    if (res.ok) setData(await res.json());
  }, [id]);

  useEffect(() => {
    load();
    // Keep polling only while waiting for the theater to run the matcher.
    const t = setInterval(() => {
      setData((d) => {
        if (!d || d.booking.status === "waiting") load();
        return d;
      });
    }, 2500);
    return () => clearInterval(t);
  }, [id, load]);

  if (!data) return <main className="mx-auto max-w-2xl px-5 py-16 text-muted">Loading…</main>;

  const { booking, movie, showtime, seatmates } = data;
  const time = showtime ? new Date(showtime.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

  async function leave() {
    await fetch(`/api/bookings/${id}/leave`, { method: "POST" });
    load();
  }

  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-panel-2 text-3xl">{movie?.poster}</div>
        <div>
          <h1 className="text-2xl font-medium">{movie?.title}</h1>
          <p className="text-sm text-muted">
            {showtime?.auditorium} · {time}
          </p>
        </div>
      </div>

      {booking.status === "waiting" && (
        <div className="mt-10 rounded-2xl border border-border bg-panel p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-black/15 border-t-accent" />
          <h2 className="text-lg font-semibold">You&apos;re in, {booking.name}.</h2>
          <p className="mt-1 text-sm text-muted">
            We&apos;re gathering solo-goers for this show. Our matcher runs automatically{" "}
            {showtime && autoMatchLabel(showtime.autoMatchAt)}, locking in a compatible seatmate and
            adjacent seats. Hang tight, this page updates itself.
          </p>
        </div>
      )}

      {booking.status === "matched" && (
        <div className="mt-10 space-y-4">
          <div className="rounded-2xl border border-accent-2/40 bg-accent-2/10 p-6">
            <h2 className="text-lg font-semibold">
              {seatmates.length > 1 ? "You've got your seatmates!" : "You've got a seatmate!"} 🎉
            </h2>
            <p className="mt-1 text-sm text-muted">
              Meet by the {showtime?.auditorium} entrance 10 minutes before the film.
            </p>
            <div className="mt-5 space-y-3">
              <PersonRow name={`${booking.name} (you)`} sub={VIBE_LABEL[booking.vibe]} seat={booking.seatId} rep={data.reputation} you />
              {seatmates.map((m) => (
                <PersonRow
                  key={m.userId}
                  name={m.name}
                  sub={`${m.ageBand} · ${VIBE_LABEL[m.vibe]}`}
                  seat={m.seatId}
                  rep={m.reputation}
                  userId={m.userId}
                  onRated={load}
                />
              ))}
            </div>
          </div>

          {(data.sharedInterests.length > 0 || data.iceBreaker) && (
            <div className="rounded-2xl border border-border bg-panel p-5">
              {data.sharedInterests.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">You all like</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.sharedInterests.map((t) => (
                      <span key={t} className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {data.iceBreaker && (
                <p className="mt-4 text-sm">
                  <span className="font-semibold">Ice-breaker:</span>{" "}
                  <span className="text-muted">{data.iceBreaker}</span>
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-5">
            <span className="text-2xl">🍿</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Matched-group snack combo</p>
              <p className="text-xs text-muted">15% off a shared popcorn + drinks. Show code at the counter.</p>
            </div>
            <span className="rounded-lg bg-accent/15 px-2.5 py-1 font-mono text-sm text-accent">MATE15</span>
          </div>

          <button
            onClick={leave}
            className="w-full rounded-lg border border-border py-2.5 text-sm text-muted transition hover:border-black/20 hover:text-foreground"
          >
            Actually, I&apos;d rather sit alone → switch to a solo seat
          </button>
        </div>
      )}

      {(booking.status === "solo" || booking.status === "left") && (
        <div className="mt-10 rounded-2xl border border-border bg-panel p-8 text-center">
          <h2 className="text-lg font-semibold">You&apos;re all set with your own seat.</h2>
          <p className="mt-1 text-sm text-muted">
            {booking.status === "left"
              ? "No problem. We moved you to your own seat"
              : "We couldn't find a compatible match for this show, so we saved you seat"}{" "}
            <span className="font-semibold text-foreground">{booking.seatId}</span>. Enjoy the film, {booking.name}!
          </p>
        </div>
      )}
      </main>
    </div>
  );
}

function RepBadge({ rep }: { rep: Rep }) {
  const map: Record<Rep["label"], { text: string; cls: string }> = {
    new: { text: "New", cls: "bg-panel-2 text-muted" },
    trusted: { text: `★ ${rep.avg?.toFixed(1)}`, cls: "bg-foreground text-background" },
    watch: { text: `★ ${rep.avg?.toFixed(1)}`, cls: "bg-panel-2 text-foreground" },
    blocked: { text: "Restricted", cls: "border border-foreground text-foreground" },
  };
  const b = map[rep.label];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${b.cls}`}>{b.text}</span>;
}

function PersonRow({
  name,
  sub,
  seat,
  rep,
  you,
  userId,
  onRated,
}: {
  name: string;
  sub: string;
  seat?: string;
  rep: Rep;
  you?: boolean;
  userId?: string;
  onRated?: () => void;
}) {
  const [rated, setRated] = useState<number | null>(null);
  const [reported, setReported] = useState(false);

  async function rate(stars: number) {
    if (!userId) return;
    setRated(stars);
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, stars }),
    });
    onRated?.();
  }
  async function report() {
    if (!userId) return;
    setReported(true);
    await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    onRated?.();
  }

  return (
    <div className="rounded-xl bg-panel-2 p-3">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold ${you ? "bg-accent text-white" : "bg-accent-2 text-white"}`}>
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{name}</p>
            <RepBadge rep={rep} />
          </div>
          <p className="text-xs capitalize text-muted">{sub}</p>
        </div>
        {seat && <span className="rounded-lg bg-black/10 px-2.5 py-1 text-sm font-semibold">{seat}</span>}
      </div>

      {!you && userId && (
        <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs text-muted">Rate after the show:</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => rate(s)}
                className={`text-base leading-none transition ${rated && s <= rated ? "text-accent" : "text-white/25 hover:text-white/50"}`}
                aria-label={`${s} stars`}
              >
                ★
              </button>
            ))}
          </div>
          <button
            onClick={report}
            disabled={reported}
            className="text-xs text-muted transition hover:text-red-600 disabled:opacity-50"
          >
            {reported ? "Reported" : "Report"}
          </button>
        </div>
      )}
    </div>
  );
}
