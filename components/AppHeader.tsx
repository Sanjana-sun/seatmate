"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearStoredUser } from "@/lib/auth";
import { useUser } from "@/lib/useUser";

// Compact header for the signed-in app pages: wordmark, nav, and the current
// user with a log-out control.
export function AppHeader() {
  const { user } = useUser();
  const router = useRouter();

  function logout() {
    clearStoredUser();
    router.push("/");
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/showtimes" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden>◐</span> SeatMate
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/showtimes" className="text-muted transition hover:text-foreground">
            Showtimes
          </Link>
          <Link href="/rally" className="text-muted transition hover:text-foreground">
            Rally
          </Link>
          <Link href="/theater" className="text-muted transition hover:text-foreground">
            For theaters
          </Link>
          {user ? (
            <div className="flex items-center gap-3 border-l border-border pl-5">
              <span className="hidden text-muted sm:inline">{user.name}</span>
              <button onClick={logout} className="text-foreground underline-offset-4 hover:underline">
                Log out
              </button>
            </div>
          ) : (
            <Link href="/login" className="border-l border-border pl-5 text-foreground underline-offset-4 hover:underline">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
