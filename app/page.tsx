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
      <section className="mx-auto w-full max-w-5xl flex-1 px-5">
        <div className="max-w-3xl py-20 sm:py-28">
          <p className="mb-6 text-sm uppercase tracking-[0.2em] text-muted">Solo at the movies?</p>
          <h1 className="display text-6xl sm:text-8xl">
            Never watch <span className="underline decoration-2 underline-offset-8">alone</span>.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted">
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
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border">
        <div className="mx-auto grid max-w-5xl gap-px bg-border sm:grid-cols-3">
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

      {/* Trust + theaters */}
      <section className="border-t border-border">
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

      <footer className="border-t border-border">
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
