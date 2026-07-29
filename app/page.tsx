"use client";

import Link from "next/link";
import { useUser } from "@/lib/useUser";

export default function Landing() {
  const { user } = useUser();
  const primaryHref = user ? "/showtimes" : "/login";

  return (
    <div className="flex min-h-full flex-col">
      {/* Marketing nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden>◐</span> SeatMate
          </span>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#how" className="hidden text-muted transition hover:text-foreground sm:inline">
              How it works
            </a>
            <Link href="/theater" className="hidden text-muted transition hover:text-foreground sm:inline">
              For theaters
            </Link>
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              Log in
            </Link>
            <Link
              href={primaryHref}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-5xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="mb-6 text-sm uppercase tracking-[0.2em] text-muted">Solo at the movies?</p>
            <h1 className="display text-6xl sm:text-7xl">
              Never watch <span className="underline decoration-2 underline-offset-8">alone</span>.
            </h1>
            <p className="mt-8 max-w-md text-lg text-muted">
              SeatMate matches you with a compatible fellow solo-goer and sits you together, using only
              the seats the theater hasn&apos;t sold. Watch your movie. Maybe make a friend.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="rounded-full bg-accent px-6 py-3 font-medium text-white transition hover:opacity-90"
              >
                Find your seatmate
              </Link>
              <Link
                href="/theater"
                className="rounded-full border border-border px-6 py-3 font-medium transition hover:border-foreground"
              >
                For theaters
              </Link>
            </div>
          </div>
          <SeatHero />
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {[
            { k: "2-4", v: "people per match" },
            { k: "100%", v: "unsold seats only" },
            { k: "1 tap", v: "to sit alone instead" },
            { k: "$0", v: "theater integration" },
          ].map((s) => (
            <div key={s.v} className="bg-background px-6 py-8">
              <div className="text-3xl font-semibold tracking-tight">{s.k}</div>
              <div className="mt-1 text-sm text-muted">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-border">
        <div className="mx-auto max-w-5xl px-5 pt-14">
          <h2 className="display text-4xl">How it works</h2>
        </div>
        <div className="mx-auto mt-8 grid max-w-5xl gap-px bg-border sm:grid-cols-3">
          {[
            { n: "01", t: "Opt in", d: "Pick a showtime and tell us your vibe: here to watch, up for a chat, or open to a new friend." },
            { n: "02", t: "We match you", d: "Our matcher groups compatible solo-goers on vibe, age, and shared taste, honoring your safety preferences." },
            { n: "03", t: "Sit together", d: "You get adjacent seats from the unsold inventory, an ice-breaker, and a graceful exit if you change your mind." },
          ].map((s) => (
            <div key={s.n} className="bg-background p-8">
              <div className="font-mono text-sm text-muted">{s.n}</div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">{s.t}</h3>
              <p className="mt-2 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-5xl gap-px bg-border sm:grid-cols-3">
          {[
            { q: "I almost skipped the film because none of my friends were free. Ended up next to someone who loved it as much as I did.", n: "Priya, 24" },
            { q: "The same-gender option and the one-tap solo switch made it feel safe to try. No pressure at all.", n: "Dana, 31" },
            { q: "We filled forty dead weeknight seats in a month. It only ever touches inventory we weren't going to sell.", n: "Marcus, indie theater owner" },
          ].map((t) => (
            <figure key={t.n} className="bg-background p-8">
              <blockquote className="text-[15px] leading-relaxed">&ldquo;{t.q}&rdquo;</blockquote>
              <figcaption className="mt-4 text-sm text-muted">{t.n}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Trust + theaters */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-5xl gap-px bg-border sm:grid-cols-2">
          <div className="bg-background p-10">
            <h3 className="text-2xl font-semibold tracking-tight">Built on trust</h3>
            <p className="mt-3 text-muted">
              Same-gender matching when you want it, peer ratings after every show, and reporting that
              pulls bad actors out of the pool. Not feeling it? Switch to a solo seat in one tap.
            </p>
          </div>
          <div className="bg-background p-10">
            <h3 className="text-2xl font-semibold tracking-tight">Good for theaters</h3>
            <p className="mt-3 text-muted">
              Every match is a ticket sold from a seat that would have sat empty. No integration
              required, we only ever touch unsold inventory.
            </p>
            <Link href="/theater" className="mt-4 inline-block text-sm underline underline-offset-4">
              See the theater dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-accent text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="display text-4xl sm:text-5xl">Find your seatmate tonight.</h2>
          <Link
            href={primaryHref}
            className="rounded-full bg-white px-6 py-3 font-medium text-accent transition hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <span aria-hidden>◐</span> SeatMate
          </span>
          <span>Demo · the matcher only ever uses seats the theater hasn&apos;t sold.</span>
        </div>
      </footer>
    </div>
  );
}

// A small auditorium diagram: mostly empty and sold seats, with one adjacent
// pair highlighted as a match — the product in one glance.
function SeatHero() {
  const rows = 5;
  const cols = 9;
  const sold = new Set(["0-1", "0-6", "1-2", "1-7", "2-0", "2-8", "3-3", "3-4", "4-1", "4-6", "4-7"]);
  const matched = new Set(["2-4", "2-5"]);

  return (
    <div className="rounded-2xl border border-border p-6">
      <div className="mx-auto mb-1 h-1 w-2/3 rounded-full bg-panel-2" />
      <p className="mb-5 text-center text-[10px] uppercase tracking-[0.3em] text-muted">Screen</p>
      <div className="flex flex-col items-center gap-2">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-2">
            {Array.from({ length: cols }, (_, c) => {
              const key = `${r}-${c}`;
              const cls = matched.has(key)
                ? "bg-foreground"
                : sold.has(key)
                  ? "bg-panel-2"
                  : "border border-foreground/25";
              return <div key={c} className={`h-5 w-5 rounded-[5px] ${cls}`} />;
            })}
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
        <span className="h-3 w-3 rounded-[3px] bg-foreground" />
        You + your seatmate, seated together
      </div>
    </div>
  );
}
