// Demo-only "auth": we store the signed-in person in the browser. There's no
// server, no password check — it just remembers who you are so the app can
// greet you and prefill your name in the matching flow. Swap for real auth
// (sessions + a hosted DB) later.

export interface SeatUser {
  name: string;
  email: string;
}

const KEY = "seatmate_user";

export function getStoredUser(): SeatUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SeatUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: SeatUser): void {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(KEY);
}

// Fallback display name from an email local-part, e.g. "ada.lovelace" -> "Ada".
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? local;
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "Guest";
}
