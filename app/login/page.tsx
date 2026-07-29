"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nameFromEmail, setStoredUser } from "@/lib/auth";

// Demo login: no real auth. Any credentials "work" — we just remember your
// name locally so the app can greet you and prefill the matching form.
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter an email and password.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("What should we call you?");
      return;
    }
    const displayName = mode === "signup" ? name.trim() : nameFromEmail(email);
    setStoredUser({ name: displayName.slice(0, 40), email: email.trim() });
    router.push("/showtimes");
  }

  function demoSocial(provider: string) {
    // Stand-in for OAuth: seed a friendly demo identity and continue.
    setStoredUser({ name: "Alex", email: `alex@${provider}.demo` });
    router.push("/showtimes");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden>◐</span> SeatMate
          </Link>
          <Link href="/" className="text-sm text-muted transition hover:text-foreground">
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
        <h1 className="display text-4xl">{mode === "login" ? "Welcome back." : "Create your account."}</h1>
        <p className="mt-3 text-sm text-muted">
          {mode === "login" ? "Log in to find your seatmate." : "Sign up to start matching with fellow solo-goers."}{" "}
          <span className="text-muted">This is a demo, any details work.</span>
        </p>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => demoSocial("google")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium transition hover:border-foreground"
          >
            <span aria-hidden>G</span> Continue with Google
          </button>
          <button
            onClick={() => demoSocial("apple")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium transition hover:border-foreground"
          >
            <span aria-hidden></span> Continue with Apple
          </button>
        </div>

        <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-widest text-muted">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sanjana"
                className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2.5 outline-none focus:border-foreground"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2.5 outline-none focus:border-foreground"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2.5 outline-none focus:border-foreground"
            />
          </Field>

          {error && <p className="text-sm text-foreground">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-accent py-2.5 font-medium text-white transition hover:opacity-90"
          >
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? "New to SeatMate?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setError(null);
              setMode(mode === "login" ? "signup" : "login");
            }}
            className="text-foreground underline underline-offset-4"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </main>
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
