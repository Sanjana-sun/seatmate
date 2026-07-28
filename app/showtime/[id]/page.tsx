"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { INTEREST_TAGS } from "@/lib/types";
import type { AgeBand, Gender, GenderPref, Interest, Seat, Vibe } from "@/lib/types";

interface ShowtimeData {
  showtime: { id: string; auditorium: string; startsAt: string; rows: string[]; seatsPerRow: number };
  movie: { title: string; poster: string; rating: string; runtimeMins: number; blurb: string };
  seats: Seat[];
  optedIn: number;
  waiting: number;
}

const VIBES: { value: Vibe; label: string; hint: string }[] = [
  { value: "quiet", label: "Just here to watch", hint: "Minimal talking" },
  { value: "chatty", label: "Happy to chat", hint: "Before and after" },
  { value: "friendly", label: "Open to a new friend", hint: "Let's hang" },
];
const AGES: AgeBand[] = ["18-24", "25-34", "35-49", "50+"];
const GENDERS: Gender[] = ["female", "male", "nonbinary"];

export default function ShowtimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ShowtimeData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [matching, setMatching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [ageBand, setAgeBand] = useState<AgeBand>("25-34");
  const [vibe, setVibe] = useState<Vibe>("chatty");
  const [genderPref, setGenderPref] = useState<GenderPref>("any");
  const [maxGroupSize, setMaxGroupSize] = useState<2 | 3 | 4>(2);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [aisleSeat, setAisleSeat] = useState(false);

  function toggleInterest(tag: Interest) {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 6 ? prev : [...prev, tag],
    );
  }

  async function load() {
    const res = await fetch(`/api/showtimes/${id}`);
    if (res.ok) setData(await res.json());
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ showtimeId: id, name, gender, ageBand, vibe, genderPref, maxGroupSize, interests, aisleSeat }),
    });
    setSubmitting(false);
    if (res.ok) {
      const { booking } = await res.json();
      router.push(`/match/${booking.id}`);
    } else {
      setNotice("Something went wrong. Try again.");
    }
  }

  // Demo helper: theater-side trigger to run the matcher now.
  async function runMatch() {
    setMatching(true);
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ showtimeId: id }),
    });
    setMatching(false);
    if (res.ok) {
      const { summary } = await res.json();
      setNotice(`Matched ${summary.matched} people into ${summary.groups} groups (${summary.solos} seated solo).`);
      load();
    }
  }

  if (!data) return <main className="mx-auto max-w-4xl px-5 py-10 text-muted">Loading…</main>;

  const { movie, showtime, seats } = data;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← All showtimes
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-xl bg-panel-2 text-4xl">{movie.poster}</div>
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">{movie.title}</h1>
          <p className="text-sm text-muted">
            {showtime.auditorium} · {new Date(showtime.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ·{" "}
            {movie.rating} · {movie.runtimeMins} min
          </p>
          <p className="mt-1 max-w-lg text-sm text-muted">{movie.blurb}</p>
        </div>
      </div>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">The room</h2>
          <SeatMap seats={seats} rows={showtime.rows} perRow={showtime.seatsPerRow} />
          <Legend />
          <p className="mt-3 text-xs text-muted">
            {data.optedIn} solo-goer{data.optedIn === 1 ? "" : "s"} opted in · {data.waiting} still waiting to be matched
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Find me a seatmate</h2>
          <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-panel p-5">
            <Field label="Your name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sanjana"
                className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 outline-none focus:border-accent"
              />
            </Field>

            <Field label="Your vibe tonight">
              <div className="grid gap-2">
                {VIBES.map((v) => (
                  <button
                    type="button"
                    key={v.value}
                    onClick={() => setVibe(v.value)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                      vibe === v.value ? "border-accent bg-accent/10" : "border-border bg-panel-2 hover:border-black/20"
                    }`}
                  >
                    <span>{v.label}</span>
                    <span className="text-xs text-muted">{v.hint}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Age band">
                <Select value={ageBand} onChange={(v) => setAgeBand(v as AgeBand)} options={AGES} />
              </Field>
              <Field label="You are">
                <Select value={gender} onChange={(v) => setGender(v as Gender)} options={GENDERS} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Match me with">
                <div className="flex gap-2">
                  {(["any", "same"] as GenderPref[]).map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGenderPref(g)}
                      className={`flex-1 rounded-lg border px-2 py-2 text-sm capitalize transition ${
                        genderPref === g ? "border-accent bg-accent/10" : "border-border bg-panel-2"
                      }`}
                    >
                      {g === "same" ? "Same gender" : "Anyone"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Group up to">
                <div className="flex gap-2">
                  {([2, 3, 4] as const).map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setMaxGroupSize(n)}
                      className={`flex-1 rounded-lg border py-2 text-sm transition ${
                        maxGroupSize === n ? "border-accent bg-accent/10" : "border-border bg-panel-2"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="Your taste (pick up to 6)">
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.map((tag) => {
                  const on = interests.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        on ? "border-accent bg-accent/15 text-accent" : "border-border bg-panel-2 text-muted hover:border-black/20"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </Field>

            <button
              type="button"
              onClick={() => setAisleSeat((v) => !v)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                aisleSeat ? "border-accent bg-accent/10" : "border-border bg-panel-2 hover:border-black/20"
              }`}
            >
              <span>
                Prefer an aisle seat
                <span className="block text-xs text-muted">Easy to slip out any time</span>
              </span>
              <span className={`h-5 w-9 rounded-full p-0.5 transition ${aisleSeat ? "bg-accent" : "bg-black/15"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition ${aisleSeat ? "translate-x-4" : ""}`} />
              </span>
            </button>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "Joining…" : "Find my seatmate"}
            </button>
          </form>

          <div className="mt-4 rounded-xl border border-dashed border-black/15 p-4">
            <p className="text-xs text-muted">
              <span className="font-semibold text-foreground">Theater controls (demo):</span> normally the matcher
              runs automatically a bit before showtime. Trigger it now:
            </p>
            <button
              onClick={runMatch}
              disabled={matching}
              className="mt-3 w-full rounded-lg border border-accent-2/50 bg-accent-2/15 py-2 text-sm font-medium text-accent-2 transition hover:bg-accent-2/25 disabled:opacity-50"
            >
              {matching ? "Matching…" : "Run matching now"}
            </button>
            {notice && <p className="mt-3 text-xs text-accent">{notice}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

function SeatMap({ seats, rows, perRow }: { seats: Seat[]; rows: string[]; perRow: number }) {
  const byId = new Map(seats.map((s) => [s.id, s]));
  return (
    <div className="rounded-2xl border border-border bg-panel p-4">
      <div className="mx-auto mb-4 h-1.5 w-3/4 rounded-full bg-black/15" />
      <p className="mb-3 text-center text-[10px] uppercase tracking-widest text-muted">Screen</p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row} className="flex items-center justify-center gap-1.5">
            <span className="w-4 text-right text-[10px] text-muted">{row}</span>
            {Array.from({ length: perRow }, (_, i) => {
              const seat = byId.get(`${row}${i + 1}`);
              return <SeatDot key={i} status={seat?.status ?? "free"} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SeatDot({ status }: { status: Seat["status"] }) {
  const cls =
    status === "sold"
      ? "bg-black/10"
      : status === "held"
        ? "bg-accent-2"
        : "border border-accent/60 bg-accent/10";
  return <div className={`h-4 w-4 rounded-[4px] ${cls}`} />;
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <i className="h-3 w-3 rounded-[3px] border border-accent/60 bg-accent/10" /> open (matcher can use)
      </span>
      <span className="flex items-center gap-1.5">
        <i className="h-3 w-3 rounded-[3px] bg-black/10" /> sold
      </span>
      <span className="flex items-center gap-1.5">
        <i className="h-3 w-3 rounded-[3px] bg-accent-2" /> matched group
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 capitalize outline-none focus:border-accent"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
