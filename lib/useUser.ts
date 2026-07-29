"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, type SeatUser } from "./auth";

// Read the demo session on the client. `loading` guards against SSR/hydration
// flashes (localStorage isn't available on the server).
export function useUser(): { user: SeatUser | null; loading: boolean } {
  const [user, setUser] = useState<SeatUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);
  return { user, loading };
}

// Gate a page behind the demo login: redirect to /login if nobody's signed in.
export function useRequireUser(): { user: SeatUser | null; loading: boolean } {
  const { user, loading } = useUser();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  return { user, loading };
}
