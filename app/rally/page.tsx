"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Gender } from "@/lib/types";

interface Movie {
  id: string;
  title: string;
  poster: string;
}
interface RallyRow {
  id: string;
  movieId: string;
  window: string;
  supporters: number;
  movie?: Movie;
}

const WINDOWS = ["Tonight, late", "This weekend, matinee", "This weekend, evening", "Weeknight, after work"];
const GENDERS: Gender[] = ["female", "male", "nonbinary"];

export default function RallyPage() {
  const [rallies, setRallies] = useState<RallyRow[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [movieId, setMovieId] = useState("");
  const [window, setWindow] = useState(WINDOWS[2]);

  const load = useCallback(async () => {
    const res = await fetch("/api/rally");
    if (res.ok) {
      const d = await res.json();
      setRallies(d.rallies);
      setMovies(d.movies);
      if (!movieId && d.movies[0]) setMovieId(d.movies[0].id);
    }
  }, [movieId]);
  useEffect(() => {
    load();
  }, [load]);

  async function support(mId: string, win: string) {
    if (!name.trim()) return;
    await fetch("/api/rally", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ movieId: mId, window: win, name, gender }),
    });
    load();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← All showtimes
      </Link>
      <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight">Rally a showing</h1>
      <p className="mt-1 max-w-xl text-muted">
        Want to see something that isn&apos;t on the schedule? Back a slot. When enough solo-goers
        rally, the theater can add the showing and we&apos;ll match everyone who backed it.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-panel p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sanjana"
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">You are</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 capitalize outline-none focus:border-accent"
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Movie</span>
            <select
              value={movieId}
              onChange={(e) => setMovieId(e.target.value)}
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 outline-none focus:border-accent"
            >
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">When</span>
            <select
              value={window}
              onChange={(e) => setWindow(e.target.value)}
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 outline-none focus:border-accent"
            >
              {WINDOWS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          onClick={() => support(movieId, window)}
          disabled={!name.trim() || !movieId}
          className="mt-4 w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          Start / back this rally
        </button>
      </div>

      <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Open rallies</h2>
      {rallies.length === 0 ? (
        <p className="text-sm text-muted">No rallies yet. Start the first one above.</p>
      ) : (
        <div className="space-y-2">
          {rallies.map((r) => {
            const ready = r.supporters >= 8;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-panel p-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-panel-2 text-xl">{r.movie?.poster}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.movie?.title}</p>
                  <p className="text-xs text-muted">{r.window}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs ${ready ? "bg-emerald-600/12 text-emerald-700" : "bg-black/10 text-muted"}`}>
                  {r.supporters} backing{ready ? " · ready" : ""}
                </span>
                <button
                  onClick={() => support(r.movieId, r.window)}
                  disabled={!name.trim()}
                  className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
